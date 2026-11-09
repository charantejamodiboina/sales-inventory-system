from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.order import SalesOrder, OrderStatus
from app.models.approval import OrderApproval, ApprovalAction
from app.models.user import User, UserRole
from app.schemas.approval import ApprovalDecisionRequest
from app.services.inventory_service import InventoryService
from app.services.email_service import EmailService
from app.services.order_service import OrderService

class ApprovalService:
    @staticmethod
    def process_approval(
        db: Session, order_id: int, decision: ApprovalDecisionRequest, manager_user: User
    ) -> OrderApproval:
        # 1. Role validation
        if manager_user.role not in [UserRole.MANAGER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: Only managers and administrators can approve or reject sales orders."
            )

        # 2. Fetch order with lock where supported
        order = db.query(SalesOrder).filter(SalesOrder.id == order_id).with_for_update().first() if db.bind.dialect.name != "sqlite" else db.query(SalesOrder).filter(SalesOrder.id == order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sales order with ID {order_id} not found."
            )

        # 3. Prevent self-approval if sales user is involved
        if order.created_by_user_id == manager_user.id and manager_user.role == UserRole.SALES_USER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sales users cannot approve their own orders."
            )

        # 4. Check already processed status
        if order.status != OrderStatus.PENDING_APPROVAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order {order.order_number} has already been processed with status '{order.status.value}'. Duplicate approval is not permitted."
            )

        threshold = OrderService.get_approval_threshold(db)

        # 5. Process decision
        if decision.action == ApprovalAction.APPROVED:
            # Check stock and deduct inventory
            InventoryService.deduct_stock_for_order(db, order, manager_user.id)
            order.status = OrderStatus.COMPLETED
            order.updated_at = datetime.utcnow()

            # Record approval
            approval = OrderApproval(
                order_id=order.id,
                decided_by_user_id=manager_user.id,
                action=ApprovalAction.APPROVED,
                comments=decision.comments,
                threshold_amount=threshold,
                order_total_amount=float(order.total_amount),
                created_at=datetime.utcnow()
            )
            db.add(approval)
            db.flush()

            # Send email to creator
            sales_user = db.query(User).filter(User.id == order.created_by_user_id).first()
            if sales_user:
                EmailService.send_order_approved_email(db, order, sales_user, manager_user, decision.comments)

        elif decision.action == ApprovalAction.REJECTED:
            # Mark rejected, NO inventory deduction
            order.status = OrderStatus.REJECTED
            order.updated_at = datetime.utcnow()

            approval = OrderApproval(
                order_id=order.id,
                decided_by_user_id=manager_user.id,
                action=ApprovalAction.REJECTED,
                comments=decision.comments,
                threshold_amount=threshold,
                order_total_amount=float(order.total_amount),
                created_at=datetime.utcnow()
            )
            db.add(approval)
            db.flush()

            sales_user = db.query(User).filter(User.id == order.created_by_user_id).first()
            if sales_user:
                EmailService.send_order_rejected_email(db, order, sales_user, manager_user, decision.comments)

        db.commit()
        db.refresh(approval)
        return approval

