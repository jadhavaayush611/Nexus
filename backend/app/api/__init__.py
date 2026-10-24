"""Nexus API router setup."""
from fastapi import APIRouter
from app.api.routes.complaints import router as complaints_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.health import router as health_router
from app.api.routes.institutions import router as institutions_router

api_router = APIRouter()

# Mount all endpoint routers
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(institutions_router)
api_router.include_router(complaints_router)
api_router.include_router(dashboard_router)

__all__ = ["api_router"]
