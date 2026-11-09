from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.order import SalesOrder, OrderStatus
from app.models.approval import OrderApproval
from app.models.user import User, UserRole
from app.schemas.order import OrderResponse
from app.schemas.approval import ApprovalDecisionRequest, ApprovalResponse
from app.services.approval_service import ApprovalService
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/approvals", tags=["Manager Approvals"])

@router.get("/pending", response_model=List[OrderResponse])
def get_pending_approvals(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN))
):
    """
    Lists all orders currently in PENDING_APPROVAL status.
    Accessible to Managers and Admins.
    """
    orders = db.query(SalesOrder).filter(
        SalesOrder.status == OrderStatus.PENDING_APPROVAL
    ).order_by(desc(SalesOrder.created_at)).offset(skip).limit(limit).all()

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

@router.get("/history", response_model=List[ApprovalResponse])
def get_approval_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN))
):
    """
    Returns audit trail of all approval and rejection decisions.
    """
    approvals = db.query(OrderApproval).order_by(desc(OrderApproval.created_at)).offset(skip).limit(limit).all()
    result = []
    for a in approvals:
        result.append(
            ApprovalResponse(
                id=a.id,
                order_id=a.order_id,
                order_number=a.order.order_number if a.order else "N/A",
                decided_by_user_id=a.decided_by_user_id,
                decided_by_username=a.decided_by_user.username if a.decided_by_user else "Unknown",
                action=a.action,
                comments=a.comments,
                threshold_amount=float(a.threshold_amount),
                order_total_amount=float(a.order_total_amount),
                created_at=a.created_at
            )
        )
    return result

@router.post("/{order_id}/decide", response_model=ApprovalResponse)
def decide_order_approval(
    order_id: int,
    decision: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN))
):
    """
    Allows a manager/admin to approve or reject an order.
    Executes within an atomic transaction:
    - If approved: stock is deducted, status set to COMPLETED, sales user notified via email.
    - If rejected: no inventory deducted, status set to REJECTED, sales user notified via email.
    """
    approval = ApprovalService.process_approval(
        db=db,
        order_id=order_id,
        decision=decision,
        manager_user=current_user
    )
    return ApprovalResponse(
        id=approval.id,
        order_id=approval.order_id,
        order_number=approval.order.order_number if approval.order else "N/A",
        decided_by_user_id=approval.decided_by_user_id,
        decided_by_username=approval.decided_by_user.username if approval.decided_by_user else "Unknown",
        action=approval.action,
        comments=approval.comments,
        threshold_amount=float(approval.threshold_amount),
        order_total_amount=float(approval.order_total_amount),
        created_at=approval.created_at
    )

