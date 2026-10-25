from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit_event import AuditEvent
from app.models.relationship import Relationship
from app.schemas.relationship import VALID_REVIEW_DECISIONS


def review_relationship(
    db: Session,
    relationship_id: int,
    decision: str,
    review_reason: Optional[str] = None,
    actor: Optional[str] = None,
) -> Relationship:
    """
    Records an explicit, auditable human review decision on a candidate relationship.

    Supported decisions: 'confirmed', 'dismissed', 'needs_info'.
    - 'dismissed' mandates a non-empty explanation rationale.
    - Persists an immutable AuditEvent tracking the decision and reviewer role.
    - Preserves both original complaint records untouched (no merge or deletion).
    """
    rel = db.get(Relationship, relationship_id)
    if not rel:
        raise ValueError(f"Relationship with id {relationship_id} not found.")

    dec = decision.strip().lower()
    if dec not in VALID_REVIEW_DECISIONS:
        allowed = ", ".join(sorted(VALID_REVIEW_DECISIONS))
        raise ValueError(f"Invalid decision '{decision}'. Allowed decisions: {allowed}.")

    clean_reason = review_reason.strip() if review_reason else None

    # Enforce mandatory explanation when dismissing a suggested link
    if dec == "dismissed" and not clean_reason:
        raise ValueError("A non-empty review_reason is required when dismissing a relationship.")

    reviewer_actor = actor.strip() if (actor and actor.strip()) else "demo-reviewer"
    previous_state = rel.state

    # Update relationship state
    rel.state = dec
    rel.review_reason = clean_reason
    rel.updated_at = datetime.now(timezone.utc)
    db.add(rel)

    # Record immutable audit event
    audit_entry = AuditEvent(
        entity_type="relationship",
        entity_id=str(rel.id),
        action=f"relationship_{dec}",
        actor=reviewer_actor,
        details={
            "previous_state": previous_state,
            "decision": dec,
            "reason": clean_reason,
            "complaint_a_id": rel.complaint_a_id,
            "complaint_b_id": rel.complaint_b_id,
            "score": rel.score,
        },
    )
    db.add(audit_entry)

    db.commit()
    db.refresh(rel)
    return rel
