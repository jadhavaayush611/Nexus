"""API routes package."""
from app.api.routes.audit_events import router as audit_events_router
from app.api.routes.complaints import router as complaints_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.evaluation import router as evaluation_router
from app.api.routes.health import router as health_router
from app.api.routes.import_csv import router as import_csv_router
from app.api.routes.institutions import router as institutions_router
from app.api.routes.matching import router as matching_router
from app.api.routes.relationships import router as relationships_router

__all__ = [
    "health_router",
    "institutions_router",
    "complaints_router",
    "dashboard_router",
    "matching_router",
    "relationships_router",
    "audit_events_router",
    "import_csv_router",
    "evaluation_router",
]
