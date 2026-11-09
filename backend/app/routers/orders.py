from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.order import SalesOrder, OrderStatus
from app.models.user import User, UserRole
from app.schemas.order import OrderCreate, OrderResponse, OrderDetailResponse, OrderItemResponse, OrderApprovalHistoryItem
from app.services.order_service import OrderService
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/orders", tags=["Sales Orders"])

@router.get("", response_model=List[OrderResponse])
def list_orders(
    status: Optional[OrderStatus] = None,
    customer_id: Optional[int] = None,
    my_orders_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SalesOrder)

    # If sales user requests 'my orders only' or sales user role restricts view
    if my_orders_only or (current_user.role == UserRole.SALES_USER and my_orders_only):
        query = query.filter(SalesOrder.created_by_user_id == current_user.id)

    if status:
        query = query.filter(SalesOrder.status == status)

    if customer_id:
        query = query.filter(SalesOrder.customer_id == customer_id)

    orders = query.order_by(desc(SalesOrder.created_at)).offset(skip).limit(limit).all()

    result = []
    for o in orders:
        result.append(
            OrderResponse(
                id=o.id,
                order_number=o.order_number,
                customer_id=o.customer_id,
                customer_name=o.customer.name if o.customer else "Unknown",
                created_by_user_id=o.created_by_user_id,
                created_by_username=o.created_by_user.username if o.created_by_user else "Unknown",
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
    return result

@router.get("/{order_id}", response_model=OrderDetailResponse)
def get_order_details(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(SalesOrder).filter(SalesOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales order not found")

    items_list = []
    for it in order.items:
        items_list.append(
            OrderItemResponse(
                id=it.id,
                product_id=it.product_id,
                product_sku=it.product.sku if it.product else "N/A",
                product_name=it.product.name if it.product else "N/A",
                quantity=it.quantity,
                unit_price=float(it.unit_price),
                total_price=float(it.total_price)
            )
        )

    approvals_list = []
    for ap in order.approvals:
        approvals_list.append(
            OrderApprovalHistoryItem(
                id=ap.id,
                decided_by_username=ap.decided_by_user.username if ap.decided_by_user else "System",
                action=ap.action.value if hasattr(ap.action, "value") else str(ap.action),
                comments=ap.comments,
                threshold_amount=float(ap.threshold_amount),
                order_total_amount=float(ap.order_total_amount),
                created_at=ap.created_at
            )
        )

    return OrderDetailResponse(
        id=order.id,
        order_number=order.order_number,
        customer_id=order.customer_id,
        customer_name=order.customer.name if order.customer else "Unknown",
        created_by_user_id=order.created_by_user_id,
        created_by_username=order.created_by_user.username if order.created_by_user else "Unknown",
        subtotal=float(order.subtotal),
        tax_amount=float(order.tax_amount),
        discount_amount=float(order.discount_amount),
        total_amount=float(order.total_amount),
        status=order.status,
        approval_required=order.approval_required,
        notes=order.notes,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=items_list,
        approval_history=approvals_list
    )

@router.post("", response_model=OrderDetailResponse, status_code=status.HTTP_201_CREATED)
def create_sales_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates sales order. If total <= threshold -> auto confirmed & inventory deducted.
    If total > threshold -> PENDING_APPROVAL and manager notified via email.
    """
    order = OrderService.create_order(db=db, order_in=order_in, current_user=current_user)
    return get_order_details(order_id=order.id, db=db, current_user=current_user)

