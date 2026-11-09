from typing import List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.product import Product
from app.models.customer import Customer
from app.models.order import SalesOrder, OrderStatus
from app.models.user import User
from app.schemas.dashboard import DashboardMetrics, StatusCount, DailySales
from app.schemas.product import ProductResponse
from app.schemas.order import OrderResponse
from app.services.order_service import OrderService

class DashboardService:
    @staticmethod
    def get_dashboard_metrics(db: Session) -> DashboardMetrics:
        # 1. Total active products
        total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0

        # 2. Total active customers
        total_customers = db.query(func.count(Customer.id)).filter(Customer.is_active == True).scalar() or 0

        # 3. Total sales (completed orders)
        total_sales_result = db.query(func.sum(SalesOrder.total_amount)).filter(
            SalesOrder.status == OrderStatus.COMPLETED
        ).scalar()
        total_sales = float(total_sales_result) if total_sales_result else 0.0

        # 4. Total orders count
        total_orders = db.query(func.count(SalesOrder.id)).scalar() or 0

        # 5. Pending approvals count
        pending_approvals = db.query(func.count(SalesOrder.id)).filter(
            SalesOrder.status == OrderStatus.PENDING_APPROVAL
        ).scalar() or 0

        # 6. Completed orders count
        completed_orders = db.query(func.count(SalesOrder.id)).filter(
            SalesOrder.status == OrderStatus.COMPLETED
        ).scalar() or 0

        # 7. Low-stock products (current_stock <= reorder_threshold)
        low_stock_query = db.query(Product).filter(
            Product.is_active == True,
            Product.current_stock <= Product.reorder_threshold
        )
        low_stock_count = low_stock_query.count()
        low_stock_products_raw = low_stock_query.order_by(Product.current_stock.asc()).limit(10).all()
        low_stock_products = [
            ProductResponse(
                id=p.id,
                sku=p.sku,
                name=p.name,
                description=p.description,
                category=p.category,
                unit_price=float(p.unit_price),
                cost_price=float(p.cost_price),
                current_stock=p.current_stock,
                reorder_threshold=p.reorder_threshold,
                is_active=p.is_active,
                is_low_stock=True,
                created_at=p.created_at,
                updated_at=p.updated_at
            )
            for p in low_stock_products_raw
        ]

        # 8. Order status counts breakdown
        status_counts_raw = db.query(SalesOrder.status, func.count(SalesOrder.id)).group_by(SalesOrder.status).all()
        status_map = {sc[0].value if hasattr(sc[0], "value") else str(sc[0]): sc[1] for sc in status_counts_raw}
        order_status_counts = [
            StatusCount(status=status.value, count=status_map.get(status.value, 0))
            for status in OrderStatus
        ]

        # 9. Recent sales activity (latest 8 orders)
        recent_orders_raw = db.query(SalesOrder).order_by(desc(SalesOrder.created_at)).limit(8).all()
        recent_sales_activity = []
        for o in recent_orders_raw:
            customer_name = o.customer.name if o.customer else "Unknown"
            creator_name = o.created_by_user.username if o.created_by_user else "Unknown"
            recent_sales_activity.append(
                OrderResponse(
                    id=o.id,
                    order_number=o.order_number,
                    customer_id=o.customer_id,
                    customer_name=customer_name,
                    created_by_user_id=o.created_by_user_id,
                    created_by_username=creator_name,
                    subtotal=float(o.subtotal),
                    tax_amount=float(o.tax_amount),
                    discount_amount=float(o.discount_amount),
                    total_amount=float(o.total_amount),
                    status=o.status,
                    approval_required=o.approval_required,
                    notes=o.notes,
                    created_at=o.created_at,
                    updated_at=o.updated_at
                )
            )

        # 10. Sales overview chart (aggregated by day over the last 14 days)
        fourteen_days_ago = datetime.utcnow() - timedelta(days=14)
        daily_sales_raw = db.query(
            func.date(SalesOrder.created_at).label("order_date"),
            func.sum(SalesOrder.total_amount).label("daily_total"),
            func.count(SalesOrder.id).label("order_count")
        ).filter(
            SalesOrder.status == OrderStatus.COMPLETED,
            SalesOrder.created_at >= fourteen_days_ago
        ).group_by(func.date(SalesOrder.created_at)).all()

        sales_chart_data = [
            DailySales(
                date=str(row.order_date),
                amount=float(row.daily_total or 0.0),
                order_count=int(row.order_count or 0)
            )
            for row in daily_sales_raw
        ]

        threshold = OrderService.get_approval_threshold(db)

        return DashboardMetrics(
            total_products=total_products,
            total_customers=total_customers,
            total_sales=total_sales,
            total_orders=total_orders,
            pending_approvals=pending_approvals,
            completed_orders=completed_orders,
            low_stock_count=low_stock_count,
            approval_threshold=threshold,
            order_status_counts=order_status_counts,
            sales_overview_chart=sales_chart_data,
            low_stock_products=low_stock_products,
            recent_sales_activity=recent_sales_activity
        )

