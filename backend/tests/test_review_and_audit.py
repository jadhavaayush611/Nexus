from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.audit_event import AuditEvent
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.relationship import Relationship


def _create_test_relationship(db_session: Session):
    inst = Institution(name="Review Testing Campus", normalized_id="RTC-01")
    db_session.add(inst)
    db_session.commit()

    c1 = Complaint(institution_id=inst.id, bureau="Cell A", description="Incident Alpha", status="open")
    c2 = Complaint(institution_id=inst.id, bureau="Cell B", description="Incident Beta", status="open")
    db_session.add_all([c1, c2])
    db_session.commit()

    rel = Relationship(
        complaint_a_id=min(c1.id, c2.id),
        complaint_b_id=max(c1.id, c2.id),
        score=0.82,
        evidence={"score_band": "High"},
        state="suggested",
    )
    db_session.add(rel)
    db_session.commit()
    db_session.refresh(rel)
    return rel, c1, c2


def test_confirm_relationship_review(client: TestClient, db_session: Session):
    """Verify confirming a relationship records decision and AuditEvent."""
    rel, c1, c2 = _create_test_relationship(db_session)

    payload = {
        "decision": "confirmed",
        "review_reason": "Verified related incident across departments.",
        "actor": "ombudsman-officer-42",
    }
    res = client.post(f"/api/relationships/{rel.id}/review", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "confirmed"
    assert data["review_reason"] == "Verified related incident across departments."

    # Verify AuditEvent was persisted
    audit = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.entity_type == "relationship", AuditEvent.entity_id == str(rel.id))
        .first()
    )
    assert audit is not None
    assert audit.action == "relationship_confirmed"
    assert audit.actor == "ombudsman-officer-42"
    assert audit.details["decision"] == "confirmed"
    assert audit.details["previous_state"] == "suggested"

    # Verify complaints are NOT merged or deleted
    assert db_session.get(Complaint, c1.id) is not None
    assert db_session.get(Complaint, c2.id) is not None


def test_dismiss_relationship_requires_reason(client: TestClient, db_session: Session):
    """Verify dismissing a suggestion requires a non-empty review_reason."""
    rel, _, _ = _create_test_relationship(db_session)

    # Missing reason
    res_bad = client.post(
        f"/api/relationships/{rel.id}/review",
        json={"decision": "dismissed", "review_reason": "   "},
    )
    assert res_bad.status_code == 400
    assert "review_reason is required" in res_bad.json()["detail"].lower()

    # Valid reason succeeds
    res_good = client.post(
        f"/api/relationships/{rel.id}/review",
        json={"decision": "dismissed", "review_reason": "False positive: completely different dates and venues."},
    )
    assert res_good.status_code == 200
    assert res_good.json()["state"] == "dismissed"


def test_needs_info_decision(client: TestClient, db_session: Session):
    """Verify marking a relationship as 'needs_info'."""
    rel, _, _ = _create_test_relationship(db_session)

    res = client.post(
        f"/api/relationships/{rel.id}/review",
        json={"decision": "needs_info", "review_reason": "Awaiting warden statement"},
    )
    assert res.status_code == 200
    assert res.json()["state"] == "needs_info"


def test_invalid_decision_and_missing_relationship(client: TestClient, db_session: Session):
    """Verify 400 for invalid decision value and 404 for missing relationship."""
    rel, _, _ = _create_test_relationship(db_session)

    # Invalid decision
    res_invalid = client.post(
        f"/api/relationships/{rel.id}/review",
        json={"decision": "auto_merge_now"},
    )
    assert res_invalid.status_code == 422 or res_invalid.status_code == 400

    # Missing relationship
    res_404 = client.post(
        "/api/relationships/999999/review",
        json={"decision": "confirmed"},
    )
    assert res_404.status_code == 404


def test_list_and_get_relationships(client: TestClient, db_session: Session):
    """Verify GET /api/relationships and GET /api/relationships/{id}."""
    rel, c1, c2 = _create_test_relationship(db_session)

    # List all
    res_list = client.get("/api/relationships")
    assert res_list.status_code == 200
    data = res_list.json()
    assert data["total"] >= 1
    item = data["items"][0]
    assert item["complaint_a"]["id"] == rel.complaint_a_id
    assert item["complaint_b"]["id"] == rel.complaint_b_id

    # Filter by state
    res_filter_state = client.get("/api/relationships?state=suggested")
    assert res_filter_state.status_code == 200
    assert len(res_filter_state.json()["items"]) >= 1

    # Filter by complaint_id
    res_filter_comp = client.get(f"/api/relationships?complaint_id={c1.id}")
    assert res_filter_comp.status_code == 200
    assert len(res_filter_comp.json()["items"]) >= 1

    # Detail view
    res_detail = client.get(f"/api/relationships/{rel.id}")
    assert res_detail.status_code == 200
    assert res_detail.json()["id"] == rel.id

    # Missing detail
    res_detail_404 = client.get("/api/relationships/999999")
    assert res_detail_404.status_code == 404


def test_audit_events_endpoint(client: TestClient, db_session: Session):
    """Verify GET /api/audit-events returns immutable chronological audit entries."""
    audit = AuditEvent(
        entity_type="relationship",
        entity_id="100",
        action="relationship_confirmed",
        actor="lead_investigator",
        details={"score": 0.9},
    )
    db_session.add(audit)
    db_session.commit()

    res = client.get("/api/audit-events")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1

    # Filter by action
    res_filtered = client.get("/api/audit-events?action=relationship_confirmed")
    assert res_filtered.status_code == 200
    assert len(res_filtered.json()["items"]) >= 1
    assert res_filtered.json()["items"][0]["action"] == "relationship_confirmed"


def test_rereview_relationship_audit_previous_state(client: TestClient, db_session: Session):
    """Verify that re-review transitions accurately record previous_state in AuditEvent."""
    rel, _, _ = _create_test_relationship(db_session)

    # First review: suggested -> needs_info
    client.post(
        f"/api/relationships/{rel.id}/review",
        json={"decision": "needs_info", "review_reason": "Need initial evidence", "actor": "reviewer_a"},
    )

    # Second review: needs_info -> confirmed
    client.post(
        f"/api/relationships/{rel.id}/review",
        json={"decision": "confirmed", "review_reason": "Evidence arrived", "actor": "reviewer_b"},
    )

    # Fetch audit events for this relationship
    res = client.get(f"/api/audit-events?entity_id={rel.id}")
    assert res.status_code == 200
    items = res.json()["items"]
    # Most recent first
    assert len(items) >= 2
    latest = items[0]
    first = items[1]
    assert latest["action"] == "relationship_confirmed"
    assert latest["details"]["previous_state"] == "needs_info"
    assert latest["details"]["decision"] == "confirmed"

    assert first["action"] == "relationship_needs_info"
    assert first["details"]["previous_state"] == "suggested"
    assert first["details"]["decision"] == "needs_info"
