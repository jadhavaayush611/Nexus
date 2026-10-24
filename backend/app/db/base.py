from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base declarative class for all Nexus SQLAlchemy models."""
    pass


def import_all_models() -> None:
    """
    Import all models so that their table definitions are registered
    with Base.metadata for reflection, table creation, and migrations.
    """
    from app.models.institution import Institution  # noqa: F401
    from app.models.complaint import Complaint  # noqa: F401
    from app.models.relationship import Relationship  # noqa: F401
    from app.models.audit_event import AuditEvent  # noqa: F401


# Ensure models are registered when base is imported
import_all_models()
