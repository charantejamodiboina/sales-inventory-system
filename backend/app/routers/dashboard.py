from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardMetrics
from app.services.dashboard_service import DashboardService
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardMetrics)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns live metrics directly computed from the MySQL / relational database.
    """
    return DashboardService.get_dashboard_metrics(db)

