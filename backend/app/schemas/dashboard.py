from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.schemas.product import ProductResponse
from app.schemas.order import OrderResponse

class StatusCount(BaseModel):
    status: str
    count: int

class DailySales(BaseModel):
    date: str
    amount: float
    order_count: int

class DashboardMetrics(BaseModel):
    total_products: int
    total_customers: int
    total_sales: float
    total_orders: int
    pending_approvals: int
    completed_orders: int
    low_stock_count: int
    approval_threshold: float
    order_status_counts: List[StatusCount]
    sales_overview_chart: List[DailySales]
    low_stock_products: List[ProductResponse]
    recent_sales_activity: List[OrderResponse]

