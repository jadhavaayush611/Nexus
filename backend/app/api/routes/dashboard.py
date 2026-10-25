from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.schemas.complaint import TERMINAL_STATUSES
from app.schemas.dashboard import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Dashboard Summary Metrics",
    description="Retrieve live database-derived operational metrics, breakdowns by bureau and status, and overdue case counts.",
)
def get_dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummaryResponse:
    # 1. Total institutions count
    total_institutions = db.query(func.count(Institution.id)).scalar() or 0

    # 2. Total complaints count
    total_complaints = db.query(func.count(Complaint.id)).scalar() or 0

    # 3. Status breakdown
    status_rows = (
        db.query(Complaint.status, func.count(Complaint.id))
        .group_by(Complaint.status)
        .all()
    )
    status_counts = {status: count for status, count in status_rows}

    # 4. Bureau breakdown
    bureau_rows = (
        db.query(Complaint.bureau, func.count(Complaint.id))
        .group_by(Complaint.bureau)
        .all()
    )
    bureau_counts = {bureau: count for bureau, count in bureau_rows}

    # 5. Overdue complaints count (due_date in past, not in terminal statuses)
    now_utc = datetime.now(timezone.utc)
    overdue_count = (
        db.query(func.count(Complaint.id))
        .filter(
            Complaint.due_date.isnot(None),
            Complaint.due_date < now_utc,
            Complaint.status.notin_(TERMINAL_STATUSES),
        )
        .scalar()
        or 0
    )

    return DashboardSummaryResponse(
        total_institutions=total_institutions,
        total_complaints=total_complaints,
        status_counts=status_counts,
        bureau_counts=bureau_counts,
        overdue_complaints=overdue_count,
    )
