from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.session import get_db

router = APIRouter()


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    response_description="Returns the operational status and service identity",
)
def health_check(db: Session = Depends(get_db)) -> Dict[str, str]:
    """
    Nexus backend health probe.

    Verifies both application responsiveness and active database connectivity.
    Returns HTTP 200 with service identity when healthy, or HTTP 503 if the
    database cannot be reached.
    """
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unreachable: {exc}",
        ) from exc

    return {
        "status": "ok",
        "service": "nexus-backend",
    }
