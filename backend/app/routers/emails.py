from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.email_log import EmailLog
from app.models.user import User
from app.schemas.email_log import EmailLogResponse
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/emails", tags=["Email Logs"])

@router.get("/logs", response_model=List[EmailLogResponse])
def get_email_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns email notification logs, demonstrating SMTP delivery / fallback logging.
    """
    logs = db.query(EmailLog).order_by(desc(EmailLog.created_at)).offset(skip).limit(limit).all()
    return logs

