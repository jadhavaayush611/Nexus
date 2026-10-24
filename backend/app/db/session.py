from collections.abc import Generator
from typing import Any, Dict, Optional
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from app.core.config import settings


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """
    Ensure SQLite enforces foreign key constraints.
    By default, SQLite disables foreign key constraint enforcement unless explicitly enabled.
    """
    if type(dbapi_connection).__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_engine_kwargs(database_url: str) -> Dict[str, Any]:
    """Return appropriate engine arguments depending on dialect."""
    kwargs: Dict[str, Any] = {}
    if database_url.startswith("sqlite"):
        # SQLite requires disabling same-thread checks when used with FastAPI thread pools
        kwargs["connect_args"] = {"check_same_thread": False}
    return kwargs


engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    **get_engine_kwargs(settings.DATABASE_URL),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a SQLAlchemy session.
    Closes the session when the request context finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(target_engine: Optional[Engine] = None) -> None:
    """
    Idempotently creates all tables registered with Base.metadata.
    Safe to call on application startup or within tests.
    """
    from app.db.base import Base

    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)
