import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from sqlalchemy.orm import Session
from app.config import settings
from app.models.email_log import EmailLog, EmailEventType, DeliveryStatus
from app.models.order import SalesOrder
from app.models.user import User

class EmailService:
    @staticmethod
    def _send_smtp(recipient_email: str, subject: str, body_text: str) -> tuple[bool, str]:
        """
        Attempts SMTP delivery to MailHog or configured SMTP host.
        Returns (success: bool, error_message: str).
        """
        if not settings.SMTP_ENABLED:
            return False, "SMTP disabled in settings"

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM
            msg["To"] = recipient_email

            part = MIMEText(body_text, "plain", "utf-8")
            msg.attach(part)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=3) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM, [recipient_email], msg.as_string())
            return True, ""
        except Exception as e:
            return False, f"SMTP delivery failed: {str(e)}"

    @classmethod
    def send_approval_request_email(
        cls, db: Session, order: SalesOrder, manager: User, threshold: float
    ) -> EmailLog:
        subject = f"[Action Required] High-Value Order Approval Needed: {order.order_number}"
        body = (
            f"Dear {manager.full_name},\n\n"
            f"A new sales order requires your management approval because its total amount exceeds "
            f"the configured threshold of INR {threshold:,.2f}.\n\n"
            f"Order Details:\n"
            f"- Order Number: {order.order_number}\n"
            f"- Customer ID: {order.customer_id}\n"
            f"- Total Amount: INR {order.total_amount:,.2f}\n"
            f"- Created At: {order.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
            f"- Current Status: PENDING_APPROVAL\n\n"
            f"Please log in to the Sales & Inventory Management Portal to review and approve or reject this order.\n\n"
            f"Best regards,\n"
            f"ApexTrack Automation System"
        )

        success, err = cls._send_smtp(manager.email, subject, body)
        status = DeliveryStatus.SENT if success else DeliveryStatus.FALLBACK_LOGGED

        log = EmailLog(
            recipient_email=manager.email,
            recipient_name=manager.full_name,
            subject=subject,
            body_text=body,
            event_type=EmailEventType.APPROVAL_REQUEST,
            related_order_id=order.id,
            delivery_status=status,
            error_message=err if not success else None,
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.flush()
        return log

    @classmethod
    def send_order_approved_email(
        cls, db: Session, order: SalesOrder, sales_user: User, manager: User, comments: str = None
    ) -> EmailLog:
        subject = f"[Approved] Sales Order {order.order_number} has been Approved"
        body = (
            f"Dear {sales_user.full_name},\n\n"
            f"Great news! Your sales order {order.order_number} (Amount: INR {order.total_amount:,.2f}) "
            f"has been APPROVED by {manager.full_name}.\n\n"
            f"Status: COMPLETED\n"
            f"Manager Comments: {comments or 'None'}\n\n"
            f"The inventory has been deducted and the order is marked as completed.\n\n"
            f"Best regards,\n"
            f"ApexTrack Operations"
        )

        success, err = cls._send_smtp(sales_user.email, subject, body)
        status = DeliveryStatus.SENT if success else DeliveryStatus.FALLBACK_LOGGED

        log = EmailLog(
            recipient_email=sales_user.email,
            recipient_name=sales_user.full_name,
            subject=subject,
            body_text=body,
            event_type=EmailEventType.ORDER_APPROVED,
            related_order_id=order.id,
            delivery_status=status,
            error_message=err if not success else None,
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.flush()
        return log

    @classmethod
    def send_order_rejected_email(
        cls, db: Session, order: SalesOrder, sales_user: User, manager: User, comments: str = None
    ) -> EmailLog:
        subject = f"[Notice] Sales Order {order.order_number} was Rejected"
        body = (
            f"Dear {sales_user.full_name},\n\n"
            f"Please be advised that your sales order {order.order_number} (Amount: INR {order.total_amount:,.2f}) "
            f"was REJECTED by {manager.full_name}.\n\n"
            f"Status: REJECTED\n"
            f"Reason / Comments: {comments or 'No reason specified'}\n\n"
            f"Inventory remains unchanged. Please contact your manager or make necessary revisions.\n\n"
            f"Best regards,\n"
            f"ApexTrack Operations"
        )

        success, err = cls._send_smtp(sales_user.email, subject, body)
        status = DeliveryStatus.SENT if success else DeliveryStatus.FALLBACK_LOGGED

        log = EmailLog(
            recipient_email=sales_user.email,
            recipient_name=sales_user.full_name,
            subject=subject,
            body_text=body,
            event_type=EmailEventType.ORDER_REJECTED,
            related_order_id=order.id,
            delivery_status=status,
            error_message=err if not success else None,
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.flush()
        return log

