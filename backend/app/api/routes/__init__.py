"""API routes package."""
from app.api.routes.complaints import router as complaints_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.health import router as health_router
from app.api.routes.institutions import router as institutions_router

__all__ = [
    "health_router",
    "institutions_router",
    "complaints_router",
    "dashboard_router",
]
