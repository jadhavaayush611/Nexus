import os
import shutil
import sqlite3
import sys
from pathlib import Path
from typing import Optional

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings


def migrate_relationships_canonical_constraint(
    database_path: Optional[Path] = None,
    backup: bool = True,
) -> bool:
    """
    Safely and non-destructively migrates an existing SQLite database's
    'relationships' table to include the canonical check constraint:
      CHECK (complaint_a_id < complaint_b_id).

    Preserves all existing data, foreign keys, and unique constraints.
    Creates a backup of the database file before executing the transaction.
    """
    if database_path is None:
        db_url = settings.DATABASE_URL
        if not db_url.startswith("sqlite:///"):
            print("Migration only applies to local SQLite databases.")
            return False
        raw_path = db_url.replace("sqlite:///", "")
        database_path = Path(raw_path)

    if not database_path.exists():
        print(f"Database file not found at {database_path}. Nothing to migrate.")
        return False

    # Inspect current schema
    conn = sqlite3.connect(database_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='relationships';"
    )
    row = cursor.fetchone()
    if not row:
        print("Table 'relationships' does not exist yet. It will be created fresh with canonical constraints.")
        conn.close()
        return True

    current_sql = row[0]
    if "check_complaint_canonical_order" in current_sql:
        print("Database schema already contains 'check_complaint_canonical_order'. No migration needed.")
        conn.close()
        return True

    conn.close()

    # Create safe backup copy
    if backup:
        backup_path = database_path.with_suffix(".db.bak")
        shutil.copy2(database_path, backup_path)
        print(f"Pre-migration backup created at: {backup_path}")

    # Execute SQLite 12-step table rebuild migration procedure
    conn = sqlite3.connect(database_path)
    try:
        conn.execute("PRAGMA foreign_keys = OFF;")
        conn.execute("BEGIN TRANSACTION;")

        # 1. Create new table with canonical constraint
        conn.execute(
            """
            CREATE TABLE relationships_canonical (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                complaint_a_id INTEGER NOT NULL,
                complaint_b_id INTEGER NOT NULL,
                score FLOAT,
                evidence JSON,
                state VARCHAR(50) NOT NULL,
                review_reason TEXT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                CONSTRAINT check_complaint_canonical_order CHECK (complaint_a_id < complaint_b_id),
                CONSTRAINT uq_complaint_pair UNIQUE (complaint_a_id, complaint_b_id),
                FOREIGN KEY(complaint_a_id) REFERENCES complaints (id) ON DELETE CASCADE,
                FOREIGN KEY(complaint_b_id) REFERENCES complaints (id) ON DELETE CASCADE
            );
            """
        )

        # 2. Transfer existing rows while normalizing pair order
        conn.execute(
            """
            INSERT INTO relationships_canonical (
                id, complaint_a_id, complaint_b_id, score, evidence, state, review_reason, created_at, updated_at
            )
            SELECT
                id,
                MIN(complaint_a_id, complaint_b_id),
                MAX(complaint_a_id, complaint_b_id),
                score,
                evidence,
                state,
                review_reason,
                created_at,
                updated_at
            FROM relationships;
            """
        )

        # 3. Drop legacy table
        conn.execute("DROP TABLE relationships;")

        # 4. Rename canonical table to original name
        conn.execute("ALTER TABLE relationships_canonical RENAME TO relationships;")

        # 5. Commit transaction and restore foreign key pragma
        conn.execute("COMMIT;")
        conn.execute("PRAGMA foreign_keys = ON;")
        print("Successfully migrated 'relationships' table to enforce canonical ordering constraint.")
        return True
    except Exception as exc:
        conn.execute("ROLLBACK;")
        print(f"Migration failed and was rolled back: {exc}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_relationships_canonical_constraint()
