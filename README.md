# Nexus

Nexus is an institutional complaint tracking and intelligence prototype designed to monitor, link, and analyze complaint cases across multiple bureaus, ombudsman cells, and administrative bodies.

## Scope & Implementation Overview

### Phase 3: Explainable Matching, Human Review, & Integration (Current Scope)
- **FastAPI backend** with Pydantic v2 domain schemas, structured error handling, and CORS middleware for local frontend development.
- **Explainable Candidate Matching Engine**:
  - Deterministic TF-IDF cosine text similarity (scikit-learn) paired with category agreement and temporal proximity.
  - Institution identity acts as a primary eligibility gate (no cross-institution matching).
  - Configurable weighting: 60% text similarity, 25% category agreement, 15% temporal proximity.
  - Transparent evidence payload: returns description overlap, category match, temporal difference, score band (`High` >= 0.75, `Review` >= 0.45, `Weak` < 0.45), signal checklist, and human-readable explanation.
  - Endpoints: `POST /api/matching/suggest/{complaint_id}` and bounded batch pass `POST /api/matching/suggest-all`.
  - Suggestions require human review; complaints are never automatically merged, modified, or closed.
- **Human-in-the-Loop Review Workflow**:
  - `POST /api/relationships/{id}/review`: Accepts review decisions (`confirmed`, `dismissed`, `needs_info`).
  - Dismissals strictly mandate an explanatory `review_reason`.
  - Re-review is supported to allow operators to adjust decisions as new evidence emerges.
  - Preserves original complaint records independently (no destructive merges).
- **Immutable Audit Trail**:
  - Automatically records chronological `AuditEvent` records for suggestion generation, relationship confirmation, dismissal, and inquiries.
  - `GET /api/audit-events`: Paginated, read-only endpoint with filtering by `entity_type`, `entity_id`, and `action`.
- **Bounded CSV Complaint Import**:
  - `POST /api/import/csv`: Accepts multipart CSV uploads with a 2 MB size limit and 500-row limit.
  - Validates required headers (`description`, `bureau`, and either `institution_id` or `normalized_id`).
  - Row-by-row transaction isolation: invalid rows are reported with 1-indexed row numbers without aborting valid imports.
- **Synthetic Benchmark Evaluation**:
  - `GET /api/evaluation/summary`: Evaluates deterministic matching against an explicit labelled synthetic dataset (positive pairs and hard negatives).
  - Computes precision, recall, F1, and confusion matrix counts safely with zero-denominator guards. Discloses synthetic nature.
- **Institution & Complaint APIs**:
  - Institution create, list, search, and detail endpoints with complaint counts.
  - Complaint multi-criteria filtering (`institution_id`, `bureau`, `status`, `category`), pagination, and partial updates (`PATCH`).
- **Dashboard Metrics**:
  - `GET /api/dashboard/summary`: Live database metrics, status breakdowns, bureau breakdowns, and active overdue case counts.
- **Relationship-Pair Integrity & Migration**:
  - Canonical ordering constraint: `CheckConstraint("complaint_a_id < complaint_b_id")` prevents self-pairs and reverse-order duplicates.
  - Non-destructive SQLite migration utility [`app/db/migrate.py`](file:///D:/Nexus/backend/app/db/migrate.py) with automated pre-migration backup (`.db.bak`).
- **Automated Tests**:
  - 54 isolated pytest tests across all modules operating against in-memory SQLite.

### Explicitly Out-of-Scope Limitations
- **Live External Integrations**: No direct connection to official government portals (e.g. CPGRAMS); operates entirely on local demo data.
- **Custom-Trained Deep Learning Models**: Uses deterministic scikit-learn TF-IDF and rules rather than black-box neural networks.
- **Automatic Complaint Merging/Closing**: Suggestions remain independent links; cases are never merged or closed by the algorithm.
- **Authentication**: No live auth or session tokens; endpoints use fictional demo roles (e.g., `demo-reviewer`).

---

## Prerequisites

- **Python 3.11+** (tested with Python 3.12).
- Operating System: Windows, macOS, or Linux.
- Git.

---

## Setup & Installation

### 1. Clone the repository and navigate to the project directory

```bash
git clone <repository-url>
cd Nexus
```

### 2. Create and activate a virtual environment

#### Windows (PowerShell):
```powershell
python -m venv backend/.venv
.\backend\.venv\Scripts\Activate.ps1
```

#### Windows (Command Prompt `cmd.exe`):
```cmd
python -m venv backend\.venv
backend\.venv\Scripts\activate.bat
```

#### Unix / macOS (bash / zsh):
```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
```

### 3. Install dependencies

From the project root:

```bash
pip install -r backend/requirements.txt
```

---

## Configuration

Nexus runs locally without requiring a `.env` file. Safe defaults are provided in code:
- **Default SQLite Database**: `backend/nexus.db` (resolved predictably regardless of working directory).
- **Environment**: `development`.
- **API Prefix**: `/api`.
- **CORS Allowlist**: `["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]`.

To customize settings, copy the example environment file:

```bash
# Windows PowerShell
Copy-Item backend/.env.example backend/.env

# Unix / macOS
cp backend/.env.example backend/.env
```

---

## Seeding Fictional Demo Data

Nexus includes an idempotent demo data seed script. It inserts 5 fictional institutions and 10 complaints across 5 bureaus (`Anti-Ragging Cell`, `Student Welfare Cell`, `Fee Regulation Cell`, `Examinations Bureau`, `Women Grievance Cell`).

From the `backend/` directory:

```bash
cd backend
python app/db/seed.py
```

Re-running the script is safe and idempotent: existing records are detected by `normalized_id` or `(institution_id, external_ref)` and skipped without duplication.

---

## Running the Backend

Start the development server from the `backend/` directory:

```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive documentation:
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`
- **OpenAPI JSON Schema**: `http://127.0.0.1:8000/openapi.json`

---

## Core API Endpoints

### 1. Health Probe
- **`GET /api/health`**
  - Verifies service availability and database connectivity via `SELECT 1`.
  - Response (`200 OK`): `{"status": "ok", "service": "nexus-backend"}`.

### 2. Candidate Matching
- **Matching Weights**: 60% description similarity (TF-IDF + cosine), 25% category agreement, 15% temporal proximity.
- **Score Bands**:
  - `High` (>= 0.75): Strong candidate with matching category and high text similarity.
  - `Review` (>= 0.45): Plausible candidate warranting operator review.
  - `Weak` (< 0.45): Below threshold; not suggested.
- **`POST /api/matching/suggest/{complaint_id}?min_threshold=0.45`**
  - Generates candidates within the same institution. Reuses existing suggestions without overwriting human decisions.
  - Response (`200 OK`):
    ```json
    {
      "source_complaint_id": 1,
      "total_candidates": 1,
      "candidates": [
        {
          "complaint": {
            "id": 2,
            "institution_id": 1,
            "institution_name": "Apex Institute of Technology & Science",
            "bureau": "Student Welfare Cell",
            "category": "Safety",
            "description": "Hostel block A freshmen intimidation reported.",
            "status": "open"
          },
          "score": 0.82,
          "score_band": "High",
          "evidence": {
            "overall_score": 0.82,
            "score_band": "High",
            "description_similarity": 0.78,
            "category_match": true,
            "category_similarity": 1.0,
            "temporal_proximity_days": 2.1,
            "temporal_similarity": 1.0,
            "institution_match": true,
            "signals": [
              "Institution identity match (ID 1)",
              "Description text similarity: 0.78",
              "Matching category: 'Safety'",
              "Filed 2.1 days apart"
            ]
          },
          "explanation": "High-confidence candidate (0.82) at same institution. Description similarity is 0.78 across bureaus 'Anti-Ragging Cell' and 'Student Welfare Cell'."
        }
      ]
    }
    ```
- **`POST /api/matching/suggest-all?max_complaints=100&min_threshold=0.45`**
  - Batch generation pass across database records.
  - Response (`200 OK`):
    ```json
    {
      "evaluated_complaints": 12,
      "candidates_considered": 18,
      "suggestions_created": 2,
      "suggestions_reused": 0,
      "candidates_rejected": 16
    }
    ```

### 3. Relationships & Human Review
- **`GET /api/relationships?state=suggested&complaint_id=1&limit=50&offset=0`**
  - Lists relationships with complaint summaries and evidence payloads.
- **`GET /api/relationships/{id}`**
  - Detailed view of a single relationship.
- **`POST /api/relationships/{id}/review`**
  - Submits human review decision (`confirmed`, `dismissed`, `needs_info`).
  - Dismissals require non-empty `review_reason`.
  - Request body:
    ```json
    {
      "decision": "confirmed",
      "review_reason": "Verified cross-cell duplicate incident.",
      "actor": "ombudsman-officer-42"
    }
    ```

### 4. Audit Trail
- **`GET /api/audit-events?entity_type=relationship&action=relationship_confirmed&limit=50&offset=0`**
  - Chronological read-only audit log tracking suggestions and operator review decisions.

### 5. CSV Complaint Import
- **`POST /api/import/csv`**
  - Multipart form upload (`file`). Limit: 2 MB, 500 rows.
  - Required header columns: `description`, `bureau`, and either `institution_id` or `normalized_id`.
  - Optional header columns: `category`, `external_ref`, `status`, `next_action`, `due_date`.
  - Response (`200 OK`):
    ```json
    {
      "total_rows": 3,
      "imported_rows": 2,
      "skipped_rows": 1,
      "errors": [
        {
          "row": 3,
          "error": "Institution not found for reference 'NONEXISTENT-CODE'."
        }
      ]
    }
    ```

### 6. Synthetic Benchmark Evaluation
- **`GET /api/evaluation/summary?threshold=0.45`**
  - Computes precision, recall, F1, and confusion matrix against a labelled synthetic test fixture.
  - Response (`200 OK`):
    ```json
    {
      "synthetic_evaluation": true,
      "positive_pairs": 3,
      "negative_pairs": 3,
      "threshold": 0.45,
      "precision": 1.0,
      "recall": 1.0,
      "f1_score": 1.0,
      "confusion_matrix": {
        "true_positives": 3,
        "false_positives": 0,
        "true_negatives": 3,
        "false_negatives": 0
      },
      "disclaimer": "Evaluation metrics are calculated on an explicit synthetic test fixture containing labelled positive and hard-negative pairs. This prototype does not claim custom model training or real-world accuracy guarantees."
    }
    ```

### 7. Institutions & Complaints Management
- `GET /api/institutions` / `POST /api/institutions` / `GET /api/institutions/{id}`
- `GET /api/complaints` / `POST /api/complaints` / `GET /api/complaints/{id}` / `PATCH /api/complaints/{id}`
- `GET /api/dashboard/summary`

---

## Relationship-Pair Integrity & SQLite Migration

### Canonical Constraint
[`Relationship`](file:///D:/Nexus/backend/app/models/relationship.py) enforces:
```python
CheckConstraint("complaint_a_id < complaint_b_id", name="check_complaint_canonical_order")
```
This guarantees that `complaint_a_id` is always strictly less than `complaint_b_id`. Self-pairs are rejected and reverse-order duplicates are impossible.

### Non-Destructive Migration Script
To apply the constraint to an existing development database without losing data, run:
```bash
cd backend
python app/db/migrate.py
```
This utility automatically creates a pre-migration backup (`nexus.db.bak`) and performs a safe SQLite table rebuild transaction.

---

## Running Automated Tests

Run the full pytest suite. Tests run in an isolated in-memory SQLite database (`sqlite:///:memory:`) and never modify the developer's local `nexus.db`.

From the repository root:

```bash
pytest backend/tests -v
```

Or from inside the `backend/` directory:

```bash
cd backend
pytest -v
```

---

## Git Ignored Files

The `.gitignore` file intentionally excludes:
- Python bytecode and compilation caches (`__pycache__/`, `*.pyc`).
- Virtual environments (`.venv/`, `venv/`).
- Local environment files and secrets (`.env`, `.env.local`).
- SQLite database storage and write-ahead logs (`*.db`, `*.sqlite`, `*.sqlite3`, `nexus.db`, `*-wal`, `*-shm`).
- Test runner and coverage artifacts (`.pytest_cache/`, `.coverage`, `htmlcov/`).
- IDE and editor configurations (`.idea/`, `.vscode/`).
