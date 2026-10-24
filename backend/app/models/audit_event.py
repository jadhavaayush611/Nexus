from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AuditEvent(Base):
    """
    Immutable audit log entry recording actions performed on entities in Nexus.

    The entity reference (entity_type + entity_id) is polymorphic and decoupled
    from foreign keys so it can track institutions, complaints, relationships,
    system tasks, and imports uniformly.
    """

    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    actor: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<AuditEvent(id={self.id}, entity='{self.entity_type}:{self.entity_id}', "
            f"action='{self.action}', actor='{self.actor}')>"
        )
