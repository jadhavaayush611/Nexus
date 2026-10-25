import sys
from pathlib import Path
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.base import Base
from app.db.session import get_db, init_db
from app.main import app
from app.models.audit_event import AuditEvent
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.relationship import Relationship


@pytest.fixture(name="test_engine")
def fixture_test_engine():
    """Create an isolated, in-memory SQLite engine for automated testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(name="db_session")
def fixture_db_session(test_engine) -> Generator[Session, None, None]:
    """Provide a transactional session bound to the isolated in-memory engine."""
    testing_session_local = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine,
    )
    session = testing_session_local()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(name="client")
def fixture_client(db_session: Session) -> Generator[TestClient, None, None]:
    """Provide a TestClient with database session overridden by test session."""
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_health_endpoint_returns_ok(client: TestClient):
    """Verify that /api/health returns HTTP 200 with status ok and service identity."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "nexus-backend"


def test_docs_and_openapi_endpoints(client: TestClient):
    """Verify that Swagger UI (/docs) and OpenAPI schema (/openapi.json) are accessible."""
    docs_response = client.get("/docs")
    assert docs_response.status_code == 200

    openapi_response = client.get("/openapi.json")
    assert openapi_response.status_code == 200
    schema = openapi_response.json()
    assert schema["info"]["title"] == "Nexus Backend"
    assert "/api/health" in schema["paths"]


def test_idempotent_schema_initialization(test_engine):
    """Verify that init_db can be called repeatedly without schema conflicts."""
    # First creation already happened in fixture, call init_db multiple times
    init_db(target_engine=test_engine)
    init_db(target_engine=test_engine)
    # Ensure tables still exist and are accessible
    assert "institutions" in Base.metadata.tables
    assert "complaints" in Base.metadata.tables
    assert "relationships" in Base.metadata.tables
    assert "audit_events" in Base.metadata.tables


def test_model_metadata_registration():
    """Verify that all four required model classes are registered with Base.metadata."""
    registered_tables = Base.metadata.tables.keys()
    expected_tables = {"institutions", "complaints", "relationships", "audit_events"}
    assert expected_tables.issubset(registered_tables), (
        f"Expected tables {expected_tables} to be in {registered_tables}"
    )

    # Verify model class bindings
    assert Institution.__tablename__ == "institutions"
    assert Complaint.__tablename__ == "complaints"
    assert Relationship.__tablename__ == "relationships"
    assert AuditEvent.__tablename__ == "audit_events"


def test_isolated_database_crud_and_constraints(db_session: Session):
    """
    Verify schema constraints, relationships, and basic data insertion
    using fictional demo records in an isolated SQLite database.
    """
    # 1. Insert fictional institution
    inst = Institution(
        name="Fictional Alpha University",
        normalized_id="FAU-DEMO-001",
        aliases=["FAU", "Alpha Tech"],
    )
    db_session.add(inst)
    db_session.commit()
    db_session.refresh(inst)
    assert inst.id is not None
    assert inst.created_at is not None
    assert inst.aliases == ["FAU", "Alpha Tech"]

    # 2. Insert fictional complaints linked to the institution
    c1 = Complaint(
        external_ref="BUR-DEMO-101",
        institution_id=inst.id,
        bureau="Disciplinary Cell",
        category="Facility Safety",
        description="Fictional demo complaint: water heating maintenance delayed.",
        status="open",
        next_action="Awaiting maintenance dispatch",
    )
    c2 = Complaint(
        external_ref="BUR-DEMO-102",
        institution_id=inst.id,
        bureau="Student Welfare Committee",
        category="Facility Safety",
        description="Fictional demo complaint: cold showers in hostel wing C.",
        status="open",
    )
    db_session.add_all([c1, c2])
    db_session.commit()
    db_session.refresh(c1)
    db_session.refresh(c2)
    assert c1.id != c2.id
    assert c1.institution.name == "Fictional Alpha University"

    # 3. Insert Relationship between complaints
    rel = Relationship(
        complaint_a_id=c1.id,
        complaint_b_id=c2.id,
        score=0.88,
        evidence={"matched_terms": ["facility safety", "water"], "method": "heuristic"},
        state="suggested",
        review_reason="Both complaints originate from same campus facility.",
    )
    db_session.add(rel)
    db_session.commit()
    db_session.refresh(rel)
    assert rel.id is not None
    assert rel.state == "suggested"
    assert rel.complaint_a.id == c1.id
    assert rel.complaint_b.id == c2.id

    # 4. Insert AuditEvent
    audit = AuditEvent(
        entity_type="relationship",
        entity_id=str(rel.id),
        action="suggested_relationship_created",
        actor="system_matcher",
        details={"score": 0.88, "rule": "facility_keywords"},
    )
    db_session.add(audit)
    db_session.commit()
    db_session.refresh(audit)
    assert audit.id is not None
    assert audit.entity_type == "relationship"

    # 5. Verify CheckConstraint: complaint cannot relate to itself
    invalid_rel = Relationship(
        complaint_a_id=c1.id,
        complaint_b_id=c1.id,  # self reference violation
        state="suggested",
    )
    db_session.add(invalid_rel)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_sqlite_foreign_key_enforcement(db_session: Session):
    """Verify that foreign key constraints are actively enforced in SQLite."""
    orphaned_complaint = Complaint(
        institution_id=999999,  # Non-existent institution
        bureau="Security Cell",
        description="Fictional complaint referencing non-existent institution",
        status="open",
    )
    db_session.add(orphaned_complaint)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_institution_normalized_id_permits_multiple_nulls(db_session: Session):
    """
    Verify that normalized_id enforces uniqueness when present
    while permitting multiple records with NULL/None values.
    """
    inst1 = Institution(name="Demo University A", normalized_id=None)
    inst2 = Institution(name="Demo University B", normalized_id=None)
    db_session.add_all([inst1, inst2])
    db_session.commit()  # Multiple NULL values must be permitted

    inst3 = Institution(name="Demo University C", normalized_id="UNIQUE-ID-001")
    db_session.add(inst3)
    db_session.commit()

    inst4 = Institution(name="Demo University D", normalized_id="UNIQUE-ID-001")
    db_session.add(inst4)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_complaint_record_independence_and_relationship_lifecycle(db_session: Session):
    """
    Verify that creating and deleting relationships NEVER merges, alters,
    or deletes the underlying complaint records.
    """
    inst = Institution(name="Independence Testing Academy", normalized_id="ITA-DEMO")
    db_session.add(inst)
    db_session.commit()

    c1 = Complaint(
        institution_id=inst.id,
        bureau="Bureau Alpha",
        description="Original Complaint One",
        status="open",
    )
    c2 = Complaint(
        institution_id=inst.id,
        bureau="Bureau Beta",
        description="Original Complaint Two",
        status="under_investigation",
    )
    db_session.add_all([c1, c2])
    db_session.commit()

    # Link complaints via Relationship
    rel = Relationship(
        complaint_a_id=c1.id,
        complaint_b_id=c2.id,
        state="suggested",
    )
    db_session.add(rel)
    db_session.commit()

    # Verify both complaints remain independent with unchanged data
    refreshed_c1 = db_session.get(Complaint, c1.id)
    refreshed_c2 = db_session.get(Complaint, c2.id)
    assert refreshed_c1 is not None
    assert refreshed_c2 is not None
    assert refreshed_c1.description == "Original Complaint One"
    assert refreshed_c2.status == "under_investigation"

    # Delete the relationship and verify complaints still exist
    db_session.delete(rel)
    db_session.commit()

    assert db_session.get(Complaint, c1.id) is not None
    assert db_session.get(Complaint, c2.id) is not None


def test_relationship_duplicate_pair_in_same_order_rejected(db_session: Session):
    """Verify that duplicate relationship pairs in the same order are rejected by UniqueConstraint."""
    inst = Institution(name="Duplicate Check College")
    db_session.add(inst)
    db_session.commit()

    c1 = Complaint(institution_id=inst.id, bureau="B1", description="C1", status="open")
    c2 = Complaint(institution_id=inst.id, bureau="B2", description="C2", status="open")
    db_session.add_all([c1, c2])
    db_session.commit()

    rel1 = Relationship(complaint_a_id=c1.id, complaint_b_id=c2.id, state="suggested")
    db_session.add(rel1)
    db_session.commit()

    rel_duplicate = Relationship(complaint_a_id=c1.id, complaint_b_id=c2.id, state="suggested")
    db_session.add(rel_duplicate)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_relationship_reverse_pair_rejected_by_canonical_constraint(db_session: Session):
    """
    Verify that the database-level CheckConstraint('complaint_a_id < complaint_b_id')
    strictly rejects inserting reverse pairs (c2, c1) when c2.id > c1.id.
    """
    from app.services.relationship_service import create_or_get_relationship

    inst = Institution(name="Canonical Pair Audit Institute")
    db_session.add(inst)
    db_session.commit()

    c1 = Complaint(institution_id=inst.id, bureau="B1", description="C1", status="open")
    c2 = Complaint(institution_id=inst.id, bureau="B2", description="C2", status="open")
    db_session.add_all([c1, c2])
    db_session.commit()

    # Ensure c1 has smaller id than c2
    assert c1.id < c2.id

    # Inserting forward pair directly succeeds
    rel_forward = Relationship(complaint_a_id=c1.id, complaint_b_id=c2.id, state="suggested")
    db_session.add(rel_forward)
    db_session.commit()

    # Inserting reverse pair directly violates check_complaint_canonical_order
    rel_reverse = Relationship(complaint_a_id=c2.id, complaint_b_id=c1.id, state="suggested")
    db_session.add(rel_reverse)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Verify that the service layer normalizes reverse order requests
    rel_retrieved, created = create_or_get_relationship(db_session, c2.id, c1.id)
    assert created is False
    assert rel_retrieved.id == rel_forward.id
    assert rel_retrieved.complaint_a_id == c1.id
    assert rel_retrieved.complaint_b_id == c2.id


def test_health_endpoint_db_failure_returns_503(client: TestClient):
    """Verify health endpoint responds with HTTP 503 if the database is unreachable."""
    class FailingDBSession:
        def execute(self, *args, **kwargs):
            raise RuntimeError("Simulated database outage")

    def failing_get_db():
        yield FailingDBSession()

    app.dependency_overrides[get_db] = failing_get_db
    try:
        response = client.get("/api/health")
        assert response.status_code == 503
        data = response.json()
        assert "Database unreachable" in data["detail"]
    finally:
        app.dependency_overrides.clear()
