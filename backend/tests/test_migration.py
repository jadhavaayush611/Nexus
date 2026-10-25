import sqlite3
from pathlib import Path
import pytest
from app.db.migrate import migrate_relationships_canonical_constraint


def test_controlled_sqlite_migration_on_legacy_schema(tmp_path: Path):
    """
    Verify that migrate_relationships_canonical_constraint upgrades a legacy schema,
    preserves existing records, creates a backup, and enforces the canonical constraint.
    """
    test_db_path = tmp_path / "test_legacy.db"

    # 1. Setup legacy schema table (Phase 1 structure without canonical order constraint)
    conn = sqlite3.connect(test_db_path)
    conn.execute("PRAGMA foreign_keys = OFF;")
    conn.execute("CREATE TABLE complaints (id INTEGER PRIMARY KEY);")
    conn.execute("INSERT INTO complaints VALUES (10), (20), (30);")
    conn.execute(
        """
        CREATE TABLE relationships (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            complaint_a_id INTEGER NOT NULL,
            complaint_b_id INTEGER NOT NULL,
            score FLOAT,
            evidence JSON,
            state VARCHAR(50) NOT NULL,
            review_reason TEXT,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            CONSTRAINT check_complaint_distinct CHECK (complaint_a_id != complaint_b_id),
            CONSTRAINT uq_complaint_pair UNIQUE (complaint_a_id, complaint_b_id)
        );
        """
    )
    # Insert a reverse pair in the legacy table to test normalization
    conn.execute(
        """
        INSERT INTO relationships (complaint_a_id, complaint_b_id, state, created_at, updated_at)
        VALUES (30, 10, 'suggested', '2026-10-24 10:00:00', '2026-10-24 10:00:00');
        """
    )
    conn.commit()
    conn.close()

    # 2. Run the migration
    success = migrate_relationships_canonical_constraint(database_path=test_db_path, backup=True)
    assert success is True

    # 3. Verify backup file was created
    backup_path = test_db_path.with_suffix(".db.bak")
    assert backup_path.exists()

    # 4. Verify migrated schema in the updated database
    conn_migrated = sqlite3.connect(test_db_path)
    sql = conn_migrated.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='relationships';"
    ).fetchone()[0]
    assert "check_complaint_canonical_order" in sql

    # Verify existing record was normalized: 30, 10 -> 10, 30
    row = conn_migrated.execute(
        "SELECT complaint_a_id, complaint_b_id, state FROM relationships;"
    ).fetchone()
    assert row == (10, 30, "suggested")

    # Verify inserting a reverse pair now directly fails at database constraint level
    with pytest.raises(sqlite3.IntegrityError):
        conn_migrated.execute(
            """
            INSERT INTO relationships (complaint_a_id, complaint_b_id, state, created_at, updated_at)
            VALUES (20, 10, 'suggested', '2026-10-24 11:00:00', '2026-10-24 11:00:00');
            """
        )
    conn_migrated.close()
