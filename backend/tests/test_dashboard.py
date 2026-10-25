from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.models.institution import Institution


def test_dashboard_summary_empty_database(client: TestClient):
    """Verify that an empty database returns zero counts and empty groupings."""
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_institutions"] == 0
    assert data["total_complaints"] == 0
    assert data["status_counts"] == {}
    assert data["bureau_counts"] == {}
    assert data["overdue_complaints"] == 0


def test_dashboard_summary_with_seeded_data(client: TestClient, db_session: Session):
    """Verify aggregated metrics, status/bureau grouping, and overdue logic."""
    now = datetime.now(timezone.utc)

    # 1. Create institutions
    inst1 = Institution(name="Metric College Alpha", normalized_id="MCA-01")
    inst2 = Institution(name="Metric College Beta", normalized_id="MCB-02")
    db_session.add_all([inst1, inst2])
    db_session.commit()

    # 2. Create complaints:
    # c1: open, due in past -> OVERDUE (active + past due date)
    c1 = Complaint(
        institution_id=inst1.id,
        bureau="Anti-Ragging Cell",
        description="Active overdue case",
        status="open",
        due_date=now - timedelta(days=2),
    )
    # c2: under_investigation, due in future -> NOT overdue
    c2 = Complaint(
        institution_id=inst1.id,
        bureau="Anti-Ragging Cell",
        description="Active future case",
        status="under_investigation",
        due_date=now + timedelta(days=5),
    )
    # c3: resolved, due in past -> NOT overdue (terminal status)
    c3 = Complaint(
        institution_id=inst2.id,
        bureau="Student Welfare Cell",
        description="Resolved past case",
        status="resolved",
        due_date=now - timedelta(days=5),
    )
    # c4: closed, due in past -> NOT overdue (terminal status)
    c4 = Complaint(
        institution_id=inst2.id,
        bureau="Student Welfare Cell",
        description="Closed past case",
        status="closed",
        due_date=now - timedelta(days=10),
    )
    # c5: open, no due date -> NOT overdue
    c5 = Complaint(
        institution_id=inst2.id,
        bureau="Fee Regulation Cell",
        description="No due date case",
        status="open",
        due_date=None,
    )
    db_session.add_all([c1, c2, c3, c4, c5])
    db_session.commit()

    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()

    assert data["total_institutions"] == 2
    assert data["total_complaints"] == 5

    # Status distribution
    assert data["status_counts"]["open"] == 2
    assert data["status_counts"]["under_investigation"] == 1
    assert data["status_counts"]["resolved"] == 1
    assert data["status_counts"]["closed"] == 1

    # Bureau distribution
    assert data["bureau_counts"]["Anti-Ragging Cell"] == 2
    assert data["bureau_counts"]["Student Welfare Cell"] == 2
    assert data["bureau_counts"]["Fee Regulation Cell"] == 1

    # Overdue count (only c1 qualifies)
    assert data["overdue_complaints"] == 1
