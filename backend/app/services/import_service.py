import csv
import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.schemas.complaint import VALID_COMPLAINT_STATUSES
from app.schemas.import_csv import ImportSummaryResponse, RowError

MAX_FILE_SIZE_BYTES: int = 2 * 1024 * 1024  # 2 MB limit
MAX_ROW_LIMIT: int = 500                    # Bounded row count


def parse_datetime(val: Optional[str]) -> Optional[datetime]:
    """Attempts to parse common ISO and date formats into UTC datetime."""
    if not val or not val.strip():
        return None
    cleaned = val.strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(cleaned, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    raise ValueError(f"Invalid date format '{val}'. Expected YYYY-MM-DD or ISO 8601.")


def import_complaints_csv(db: Session, file_content: bytes) -> ImportSummaryResponse:
    """
    Parses and imports complaint records from a CSV file.

    Guarantees:
    - Bounded file size (2 MB) and row limit (500 rows).
    - Requires 'description', 'bureau', and either 'institution_id' or 'normalized_id'.
    - Validates each row independently so invalid rows do not corrupt valid imports.
    - Never automatically links or merges complaints.
    """
    if len(file_content) > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.")

    try:
        decoded_text = file_content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            decoded_text = file_content.decode("latin-1")
        except Exception as exc:
            raise ValueError(f"Unable to decode CSV file as UTF-8: {exc}") from exc

    f = io.StringIO(decoded_text)
    try:
        reader = csv.DictReader(f)
    except Exception as exc:
        raise ValueError(f"Malformed CSV file: {exc}") from exc

    if not reader.fieldnames:
        raise ValueError("CSV file is empty or missing header line.")

    # Normalize header names (lowercase, stripped)
    header_map = {col.strip().lower(): col for col in reader.fieldnames if col}
    normalized_headers = set(header_map.keys())

    # Check required columns
    if "description" not in normalized_headers or "bureau" not in normalized_headers:
        raise ValueError("CSV header missing required columns: 'description' and 'bureau' must be present.")

    if "institution_id" not in normalized_headers and "normalized_id" not in normalized_headers:
        raise ValueError("CSV header must contain either 'institution_id' or 'normalized_id' to resolve target institution.")

    # Cache institutions to minimize database roundtrips
    institutions_by_id: Dict[int, Institution] = {}
    institutions_by_norm: Dict[str, Institution] = {}
    for inst in db.query(Institution).all():
        institutions_by_id[inst.id] = inst
        if inst.normalized_id:
            institutions_by_norm[inst.normalized_id.strip().lower()] = inst

    total_rows = 0
    imported_rows = 0
    skipped_rows = 0
    errors: List[RowError] = []

    complaints_to_insert: List[Complaint] = []

    for row_idx, row in enumerate(reader, start=2):  # Line 2 is first data row
        total_rows += 1
        if total_rows > MAX_ROW_LIMIT:
            errors.append(RowError(row=row_idx, error=f"Import terminated: Exceeded maximum limit of {MAX_ROW_LIMIT} rows."))
            skipped_rows += 1
            break

        # Map row values using normalized keys
        row_data = {k: row[header_map[k]].strip() if row.get(header_map[k]) else "" for k in normalized_headers}

        # Validate institution reference
        inst_obj: Optional[Institution] = None
        if "institution_id" in row_data and row_data["institution_id"]:
            try:
                inst_id = int(row_data["institution_id"])
                inst_obj = institutions_by_id.get(inst_id)
            except ValueError:
                errors.append(RowError(row=row_idx, error=f"Invalid institution_id '{row_data['institution_id']}': must be an integer."))
                skipped_rows += 1
                continue
        elif "normalized_id" in row_data and row_data["normalized_id"]:
            norm_key = row_data["normalized_id"].strip().lower()
            inst_obj = institutions_by_norm.get(norm_key)

        if not inst_obj:
            ref_label = row_data.get("institution_id") or row_data.get("normalized_id") or "unspecified"
            errors.append(RowError(row=row_idx, error=f"Institution not found for reference '{ref_label}'."))
            skipped_rows += 1
            continue

        # Validate bureau and description
        bureau = row_data.get("bureau", "").strip()
        if not bureau:
            errors.append(RowError(row=row_idx, error="Bureau name cannot be empty."))
            skipped_rows += 1
            continue

        description = row_data.get("description", "").strip()
        if not description:
            errors.append(RowError(row=row_idx, error="Complaint description cannot be empty."))
            skipped_rows += 1
            continue

        # Validate status
        status_val = row_data.get("status", "").strip().lower() or "open"
        if status_val not in VALID_COMPLAINT_STATUSES:
            allowed = ", ".join(sorted(VALID_COMPLAINT_STATUSES))
            errors.append(RowError(row=row_idx, error=f"Invalid status '{status_val}'. Allowed statuses: {allowed}."))
            skipped_rows += 1
            continue

        # Validate optional due_date
        due_date_dt: Optional[datetime] = None
        due_date_raw = row_data.get("due_date", "").strip()
        if due_date_raw:
            try:
                due_date_dt = parse_datetime(due_date_raw)
            except ValueError as ve:
                errors.append(RowError(row=row_idx, error=str(ve)))
                skipped_rows += 1
                continue

        ext_ref = row_data.get("external_ref", "").strip() or None
        category = row_data.get("category", "").strip() or None
        next_action = row_data.get("next_action", "").strip() or None

        complaint = Complaint(
            institution_id=inst_obj.id,
            bureau=bureau,
            description=description,
            external_ref=ext_ref,
            category=category,
            status=status_val,
            next_action=next_action,
            due_date=due_date_dt,
        )
        complaints_to_insert.append(complaint)
        imported_rows += 1

    # Persist valid complaints in transaction
    if complaints_to_insert:
        db.add_all(complaints_to_insert)
        db.commit()

    return ImportSummaryResponse(
        total_rows=total_rows,
        imported_rows=imported_rows,
        skipped_rows=skipped_rows,
        errors=errors,
    )
