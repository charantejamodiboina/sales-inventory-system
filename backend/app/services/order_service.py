import uuid
from datetime import datetime
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.config import settings
from app.models.order import SalesOrder, SalesOrderItem, OrderStatus
from app.models.customer import Customer
from app.models.product import Product
from app.models.user import User, UserRole
from app.models.settings import SystemSetting
from app.schemas.order import OrderCreate
from app.services.inventory_service import InventoryService
from app.services.email_service import EmailService

class OrderService:
    @staticmethod
    def get_approval_threshold(db: Session) -> float:
        setting = db.query(SystemSetting).filter(SystemSetting.setting_key == "APPROVAL_THRESHOLD").first()
        if setting:
            try:
                return float(setting.setting_value)
            except ValueError:
                pass
        return settings.DEFAULT_APPROVAL_THRESHOLD

    @staticmethod
    def generate_order_number(db: Session) -> str:
        today_str = datetime.utcnow().strftime("%Y%m%d")
        prefix = f"SO-{today_str}-"
        # Count orders created today
        count = db.query(func.count(SalesOrder.id)).filter(SalesOrder.order_number.like(f"{prefix}%")).scalar() or 0
        order_num = f"{prefix}{count + 1:04d}"
        
        # In case of concurrent creation, ensure uniqueness
        while db.query(SalesOrder).filter(SalesOrder.order_number == order_num).first():
            count += 1
            order_num = f"{prefix}{count + 1:04d}"
        return order_num

    @classmethod
    def create_order(cls, db: Session, order_in: OrderCreate, current_user: User) -> SalesOrder:
        # 1. Validate customer
        customer = db.query(Customer).filter(Customer.id == order_in.customer_id, Customer.is_active == True).first()
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Active customer with ID {order_in.customer_id} does not exist."
            )

        if not order_in.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order must contain at least one item."
            )

        # 2. Validate products and availability
        items_to_create = []
        subtotal = Decimal("0.00")

        # Group duplicate product IDs if any in request
        consolidated_items = {}
        for item in order_in.items:
            if item.product_id <= 0 or item.quantity <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Product ID and quantity must be positive integers."
                )
            consolidated_items[item.product_id] = consolidated_items.get(item.product_id, 0) + item.quantity

        for prod_id, qty in consolidated_items.items():
            product = db.query(Product).filter(Product.id == prod_id, Product.is_active == True).first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Active product with ID {prod_id} not found."
                )

            # Check stock availability
            if product.current_stock < qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{product.name}' (SKU: {product.sku}). Available: {product.current_stock}, Requested: {qty}."
                )

            unit_price = Decimal(str(product.unit_price))
            item_total = unit_price * Decimal(str(qty))
            subtotal += item_total

            items_to_create.append({
                "product_id": product.id,
                "quantity": qty,
                "unit_price": unit_price,
                "total_price": item_total
            })

        # 3. Calculate financial totals
        discount = Decimal(str(max(0.0, order_in.discount_amount)))
        if discount > subtotal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Discount amount cannot exceed order subtotal."
            )

        taxable_amount = subtotal - discount
        tax_rate = Decimal(str(max(0.0, order_in.tax_rate)))
        tax = taxable_amount * tax_rate
        total_amount = (taxable_amount + tax).quantize(Decimal("0.01"))

        # 4. Check approval threshold
        threshold = cls.get_approval_threshold(db)
        requires_approval = float(total_amount) > threshold

        initial_status = OrderStatus.PENDING_APPROVAL if requires_approval else OrderStatus.COMPLETED
        order_number = cls.generate_order_number(db)

        order = SalesOrder(
            order_number=order_number,
            customer_id=customer.id,
            created_by_user_id=current_user.id,
            subtotal=float(subtotal),
            discount_amount=float(discount),
            tax_amount=float(tax),
            total_amount=float(total_amount),
            status=initial_status,
            approval_required=requires_approval,
            notes=order_in.notes,
            created_at=datetime.utcnow()
        )
        db.add(order)
        db.flush()

        for it in items_to_create:
            order_item = SalesOrderItem(
                order_id=order.id,
                product_id=it["product_id"],
                quantity=it["quantity"],
                unit_price=float(it["unit_price"]),
                total_price=float(it["total_price"])
            )
            db.add(order_item)

        db.flush()

        # 5. If under threshold -> deduct inventory now!
        if not requires_approval:
            InventoryService.deduct_stock_for_order(db, order, current_user.id)
        else:
            # Notify manager(s) via email
            managers = db.query(User).filter(User.role.in_([UserRole.MANAGER, UserRole.ADMIN]), User.is_active == True).all()
            for mgr in managers:
                EmailService.send_approval_request_email(db, order, mgr, threshold)

        db.commit()
        db.refresh(order)
        return order

