from datetime import datetime, timezone
from typing import Any, List, Optional
from sqlalchemy import DateTime, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Institution(Base):
    """
    Institution entity representing an educational or monitored organization.

    Aliases: JSON array of string alternative names, e.g. ["Alpha Inst", "AIT"].
    """

    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    normalized_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, unique=True, index=True
    )
    # Stored as JSON array of strings in SQLite/compatible databases
    aliases: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship to complaints filed against this institution
    complaints: Mapped[List["Complaint"]] = relationship(  # type: ignore # noqa: F821
        "Complaint",
        back_populates="institution",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Institution(id={self.id}, name='{self.name}', normalized_id='{self.normalized_id}')>"
