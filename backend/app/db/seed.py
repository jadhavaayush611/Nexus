import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

# Ensure backend directory is in sys.path when script is executed directly
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import SessionLocal, init_db
from app.models.complaint import Complaint
from app.models.institution import Institution

# Fictional educational demo institutions
DEMO_INSTITUTIONS = [
    {
        "name": "Apex Institute of Technology & Science",
        "normalized_id": "AITS-DEMO-001",
        "aliases": ["AITS", "Apex Tech", "Apex Engineering"],
    },
    {
        "name": "Beacon National Polytechnic",
        "normalized_id": "BNP-DEMO-002",
        "aliases": ["BNP", "Beacon Poly"],
    },
    {
        "name": "Crestview Engineering Academy",
        "normalized_id": "CEA-DEMO-003",
        "aliases": ["CEA", "Crestview Academy"],
    },
    {
        "name": "Delta State College of Pharmacy",
        "normalized_id": "DSCP-DEMO-004",
        "aliases": ["DSCP", "Delta Pharma"],
    },
    {
        "name": "Elysium Institute of Management Studies",
        "normalized_id": "EIMS-DEMO-005",
        "aliases": ["EIMS", "Elysium Management"],
    },
]

# Fictional multi-bureau demo complaints
def get_demo_complaints(inst_map: Dict[str, int]) -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    return [
        # Institution 1: Apex Institute (multiple bureaus, multiple issues)
        {
            "external_ref": "ARC-2026-0101",
            "institution_id": inst_map["AITS-DEMO-001"],
            "bureau": "Anti-Ragging Cell",
            "category": "Disciplinary & Safety",
            "description": "Fictional case: Unauthorized late-night gathering reported near hostel quadrangle.",
            "status": "open",
            "next_action": "Issue formal compliance inquiry to chief warden",
            "due_date": now + timedelta(days=5),
        },
        {
            "external_ref": "SWC-2026-0102",
            "institution_id": inst_map["AITS-DEMO-001"],
            "bureau": "Student Welfare Cell",
            "category": "Infrastructure & Maintenance",
            "description": "Fictional case: Drinking water filtration plant offline in main residential block.",
            "status": "under_investigation",
            "next_action": "Facility maintenance inspection dispatch scheduled",
            # OVERDUE complaint: active status with past due_date
            "due_date": now - timedelta(days=4),
        },
        {
            "external_ref": "WGC-2026-0103",
            "institution_id": inst_map["AITS-DEMO-001"],
            "bureau": "Women Grievance Cell",
            "category": "Campus Security",
            "description": "Fictional case: Request for functional solar lighting installation on campus perimeter path.",
            "status": "open",
            "next_action": "Awaiting infrastructure committee cost appraisal",
            "due_date": now + timedelta(days=3),
        },

        # Institution 2: Beacon National Polytechnic
        {
            "external_ref": "ARC-2026-0201",
            "institution_id": inst_map["BNP-DEMO-002"],
            "bureau": "Anti-Ragging Cell",
            "category": "Disciplinary & Safety",
            "description": "Fictional case: Verbal harassment grievance reported by first-year mechanical batch.",
            "status": "under_investigation",
            "next_action": "Convene student grievance disciplinary panel",
            "due_date": now + timedelta(days=2),
        },
        {
            "external_ref": "FRC-2026-0202",
            "institution_id": inst_map["BNP-DEMO-002"],
            "bureau": "Fee Regulation Cell",
            "category": "Tuition & Fees",
            "description": "Fictional case: Refund delay for voluntary semester withdrawal application.",
            "status": "open",
            "next_action": "Accounts officer verification of fee ledger",
            # OVERDUE complaint: active status with past due_date
            "due_date": now - timedelta(days=6),
        },
        {
            "external_ref": "WGC-2026-0203",
            "institution_id": inst_map["BNP-DEMO-002"],
            "bureau": "Women Grievance Cell",
            "category": "Campus Security",
            "description": "Fictional case: Security patrol frequency enhancement requested near west boundary gate.",
            "status": "resolved",
            "next_action": "Security patrol logged; case closed following confirmation",
            # Terminal status: NOT counted in overdue despite past due_date
            "due_date": now - timedelta(days=10),
        },

        # Institution 3: Crestview Engineering Academy
        {
            "external_ref": "SWC-2026-0301",
            "institution_id": inst_map["CEA-DEMO-003"],
            "bureau": "Student Welfare Cell",
            "category": "Dining & Hygiene",
            "description": "Fictional case: Food hygiene standards audit requested for south campus dining facility.",
            "status": "open",
            "next_action": "Food safety inspection visit scheduled with health inspector",
            "due_date": now + timedelta(days=7),
        },
        {
            "external_ref": "EXB-2026-0302",
            "institution_id": inst_map["CEA-DEMO-003"],
            "bureau": "Examinations Bureau",
            "category": "Evaluation & Grades",
            "description": "Fictional case: Re-evaluation grade card dispatch delay for final-year candidates.",
            "status": "closed",
            "next_action": "Grade sheets re-issued and dispatched to candidates",
            "due_date": now - timedelta(days=20),
        },

        # Institution 4: Delta State College of Pharmacy
        {
            "external_ref": "FRC-2026-0401",
            "institution_id": inst_map["DSCP-DEMO-004"],
            "bureau": "Fee Regulation Cell",
            "category": "Tuition & Fees",
            "description": "Fictional case: Lab caution deposit reimbursement dispute following diploma completion.",
            "status": "open",
            "next_action": "Audit review of pharmacy inventory returns",
            "due_date": now + timedelta(days=12),
        },

        # Institution 5: Elysium Institute of Management Studies
        {
            "external_ref": "EXB-2026-0501",
            "institution_id": inst_map["EIMS-DEMO-005"],
            "bureau": "Examinations Bureau",
            "category": "Evaluation & Grades",
            "description": "Fictional case: Internal assessment marks mismatch on student web portal.",
            "status": "open",
            "next_action": "Registrar IT team reconciling portal database",
            "due_date": now + timedelta(days=9),
        },
    ]


def seed_demo_data(session: Optional[Session] = None) -> Dict[str, int]:
    """
    Idempotently seeds fictional demo institutions and complaints.

    Safe to run repeatedly in development:
    - Never deletes or resets existing database records.
    - Matches institutions by 'normalized_id' to prevent duplicate creations.
    - Matches complaints by '(institution_id, external_ref)' to prevent duplicates.
    """
    db_provided = session is not None
    db = session or SessionLocal()

    created_institutions = 0
    created_complaints = 0
    skipped_records = 0

    try:
        # 1. Seed institutions
        inst_map: Dict[str, int] = {}
        for inst_data in DEMO_INSTITUTIONS:
            existing = (
                db.query(Institution)
                .filter(Institution.normalized_id == inst_data["normalized_id"])
                .first()
            )
            if existing:
                inst_map[inst_data["normalized_id"]] = existing.id
                skipped_records += 1
            else:
                new_inst = Institution(
                    name=inst_data["name"],
                    normalized_id=inst_data["normalized_id"],
                    aliases=inst_data["aliases"],
                )
                db.add(new_inst)
                db.flush()
                inst_map[inst_data["normalized_id"]] = new_inst.id
                created_institutions += 1

        db.commit()

        # 2. Seed complaints
        demo_complaints = get_demo_complaints(inst_map)
        for comp_data in demo_complaints:
            existing_comp = (
                db.query(Complaint)
                .filter(
                    Complaint.institution_id == comp_data["institution_id"],
                    Complaint.external_ref == comp_data["external_ref"],
                )
                .first()
            )
            if existing_comp:
                skipped_records += 1
            else:
                new_comp = Complaint(**comp_data)
                db.add(new_comp)
                created_complaints += 1

        db.commit()

        return {
            "institutions_created": created_institutions,
            "complaints_created": created_complaints,
            "skipped_records": skipped_records,
        }
    finally:
        if not db_provided:
            db.close()


if __name__ == "__main__":
    init_db()
    result = seed_demo_data()
    print("=" * 60)
    print("Nexus Demo Data Seeding Summary:")
    print(f"  Institutions Created: {result['institutions_created']}")
    print(f"  Complaints Created:   {result['complaints_created']}")
    print(f"  Records Skipped:      {result['skipped_records']}")
    print("=" * 60)
