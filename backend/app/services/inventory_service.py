from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.order import SalesOrder
from app.models.inventory import InventoryTransaction, InventoryChangeType

class InventoryService:
    @staticmethod
    def deduct_stock_for_order(db: Session, order: SalesOrder, user_id: int):
        """
        Safely validates and deducts inventory for all items in an order.
        Raises HTTPException(400) if any item has insufficient stock.
        """
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first() if db.bind.dialect.name != "sqlite" else db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {item.product_id} not found."
                )
            
            if product.current_stock < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient inventory for '{product.name}' (SKU: {product.sku}). Available: {product.current_stock}, Requested: {item.quantity}."
                )

            prev_stock = product.current_stock
            product.current_stock -= item.quantity

            tx = InventoryTransaction(
                product_id=product.id,
                change_type=InventoryChangeType.ORDER_DEDUCTION,
                quantity_change=-item.quantity,
                previous_stock=prev_stock,
                new_stock=product.current_stock,
                reference_order_id=order.id,
                performed_by_user_id=user_id,
                notes=f"Deducted for confirmed order {order.order_number}"
            )
            db.add(tx)

    @staticmethod
    def restock_product(db: Session, product_id: int, quantity: int, user_id: int, notes: str = None) -> Product:
        if quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Restock quantity must be greater than zero."
            )
        
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found."
            )
        
        prev_stock = product.current_stock
        product.current_stock += quantity

        tx = InventoryTransaction(
            product_id=product.id,
            change_type=InventoryChangeType.RESTOCK,
            quantity_change=quantity,
            previous_stock=prev_stock,
            new_stock=product.current_stock,
            performed_by_user_id=user_id,
            notes=notes or "Restock inventory shipment"
        )
        db.add(tx)
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def adjust_stock(db: Session, product_id: int, quantity_change: int, user_id: int, notes: str = None) -> Product:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found."
            )

        if product.current_stock + quantity_change < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reduce stock by {abs(quantity_change)}. Resulting stock cannot be negative (current: {product.current_stock})."
            )

        prev_stock = product.current_stock
        product.current_stock += quantity_change

        tx = InventoryTransaction(
            product_id=product.id,
            change_type=InventoryChangeType.ADJUSTMENT,
            quantity_change=quantity_change,
            previous_stock=prev_stock,
            new_stock=product.current_stock,
            performed_by_user_id=user_id,
            notes=notes or "Stock count reconciliation adjustment"
        )
        db.add(tx)
        db.commit()
        db.refresh(product)
        return product

