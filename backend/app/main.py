from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api import api_router
from app.core.config import settings
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Initializes database schema idempotently before requests are accepted.
    """
    init_db()
    yield


def create_application() -> FastAPI:
    """
    FastAPI application factory for Nexus backend.
    Configures title, documentation endpoints, routers, and lifespan.
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=settings.DESCRIPTION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Mount API routers under the configured prefix (default: /api)
    app.include_router(api_router, prefix=settings.API_PREFIX)

    return app


app = create_application()
