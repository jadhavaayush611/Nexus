"""Nexus API router setup."""
from fastapi import APIRouter
from app.api.routes.audit_events import router as audit_events_router
from app.api.routes.complaints import router as complaints_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.evaluation import router as evaluation_router
from app.api.routes.health import router as health_router
from app.api.routes.import_csv import router as import_csv_router
from app.api.routes.institutions import router as institutions_router
from app.api.routes.matching import router as matching_router
from app.api.routes.relationships import router as relationships_router

api_router = APIRouter()

# Mount all endpoint routers under /api
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(institutions_router)
api_router.include_router(complaints_router)
api_router.include_router(dashboard_router)
api_router.include_router(matching_router)
api_router.include_router(relationships_router)
api_router.include_router(audit_events_router)
api_router.include_router(import_csv_router)
api_router.include_router(evaluation_router)

__all__ = ["api_router"]
