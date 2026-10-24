# Nexus

Nexus is an institutional complaint tracking and intelligence prototype designed to monitor, link, and analyze complaint cases across multiple bureaus, ombudsman cells, and administrative bodies.

## Scope & Implementation Overview

### Phase 2: Domain Layer & Core API (Current Scope)
- **FastAPI backend** with Pydantic v2 domain schemas, structured error handling, and CORS middleware for local frontend development.
- **Institution API**:
  - `GET /api/institutions`: Paginated listing with case-insensitive name search and dynamically computed complaint counts.
  - `GET /api/institutions/{id}`: Detail profile with complaint count.
  - `POST /api/institutions`: Register canonical institution records, enforcing unique non-null `normalized_id` (returns HTTP 409 Conflict on duplicate).
- **Complaint API**:
  - `GET /api/complaints`: Multi-criteria filtering by `institution_id`, `bureau`, `status`, `category`, with stable ordering (newest first, ID tiebreaker) and pagination.
  - `GET /api/complaints/{id}`: Single complaint record detail including institution name.
  - `POST /api/complaints`: File complaints against verified institutions (returns HTTP 404 if institution nonexistent). Non-unique external references permitted.
  - `PATCH /api/complaints/{id}`: Update mutable complaint fields (`bureau`, `category`, `description`, `status`, `next_action`, `due_date`) with automatic timestamp updates. Disallows mutating primary key or reassigning institutions.
- **Dashboard Summary**:
  - `GET /api/dashboard/summary`: Live database-derived metrics including total institutions, total complaints, status breakdowns, bureau breakdowns, and active overdue complaint counts.
- **Relationship-Pair Integrity Fix**:
  - Canonical ordering constraint: `CheckConstraint("complaint_a_id < complaint_b_id")` enforces that `complaint_a_id` is strictly lower than `complaint_b_id`, preventing self-pairs and rendering reverse pairs impossible at the database level.
  - Symmetrical service layer: `app.services.relationship_service.create_or_get_relationship()` automatically normalizes arbitrary input order into canonical order before persistence.
- **Fictional Demo-Data Seeding**:
  - Standalone script [`app/db/seed.py`](file:///D:/Nexus/backend/app/db/seed.py) providing non-destructive, idempotent seeding of 5 fictional institutions and 10 realistic multi-bureau complaint records.
- **Automated Tests**:
  - 33 isolated pytest tests verifying health, institutions, complaints, dashboard metrics, seeding idempotency, and relationship canonical constraints.

### Limitations & Out-of-Scope Features
- **AI/NLP Matching Engine**: Text embeddings, TF-IDF cosine similarity scoring, and automated candidate match generation are scheduled for subsequent phases.
- **CSV Bulk Import**: CSV parsing, row-level validation, and error reporting pipelines are scheduled for Phase 3.
- **Relationship Review Workflow**: Full frontend review workspace (confirming, dismissing, or auditing links) is not yet attached.
- **Authentication**: No live auth or user management; all endpoints operate in development mode with fictional demo roles.
- **Synthetic Data Only**: Nexus is a student prototype; it contains no real institutional records or personal data.

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

Available environment variables:
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `sqlite:///<absolute-path-to-backend>/nexus.db` | SQLAlchemy database connection string |
| `ENVIRONMENT` | `development` | Deployment environment name |
| `CORS_ORIGINS` | `["http://localhost:3000", "http://localhost:5173"]` | JSON array of allowed origins for CORS |

---

## Seeding Fictional Demo Data

Nexus includes a non-destructive, idempotent demo data seed script. It inserts 5 fictional institutions and 10 complaints across 5 bureaus (`Anti-Ragging Cell`, `Student Welfare Cell`, `Fee Regulation Cell`, `Examinations Bureau`, `Women Grievance Cell`).

From the `backend/` directory:

```bash
cd backend
python app/db/seed.py
```

Alternatively, from the repository root:

```bash
python -m backend.app.db.seed
```

Re-running the script is safe and idempotent: existing records are detected by `normalized_id` or `(institution_id, external_ref)` and skipped without duplication.

---

## Running the Backend

Start the development server from the `backend/` directory:

```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Alternatively, from the repository root:

```bash
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

---

## API Endpoints & Usage

### 1. Health Probe
- **`GET /api/health`**
  - Verifies service availability and executes `SELECT 1` against SQLite.
  - Returns HTTP 200 when healthy:
    ```json
    {
      "status": "ok",
      "service": "nexus-backend"
    }
    ```
  - Returns HTTP 503 if the database is unreachable.

### 2. Institutions
- **`GET /api/institutions?limit=50&offset=0&search=apex`**
  - Returns paginated institutions with total count and complaint counts.
  - Response (HTTP 200):
    ```json
    {
      "items": [
        {
          "id": 1,
          "name": "Apex Institute of Technology & Science",
          "normalized_id": "AITS-DEMO-001",
          "aliases": ["AITS", "Apex Tech"],
          "created_at": "2026-10-24T21:15:00Z",
          "complaint_count": 3
        }
      ],
      "total": 1,
      "limit": 50,
      "offset": 0
    }
    ```
- **`GET /api/institutions/{id}`**
  - Returns single institution profile. Returns HTTP 404 if not found.
- **`POST /api/institutions`**
  - Creates a new institution. Returns HTTP 201 on success or HTTP 409 Conflict if `normalized_id` already exists.
  - Request body:
    ```json
    {
      "name": "Beacon National Polytechnic",
      "normalized_id": "BNP-DEMO-002",
      "aliases": ["BNP", "Beacon Poly"]
    }
    ```

### 3. Complaints
- **Lifecycle Statuses**:
  - Active: `open`, `under_investigation`
  - Terminal: `resolved`, `dismissed`, `closed`
- **`GET /api/complaints?institution_id=1&bureau=Anti-Ragging%20Cell&status=open&limit=20&offset=0`**
  - Filters by institution, bureau, status, and category. Stable sorting by `created_at DESC`, `id DESC`.
  - Response (HTTP 200):
    ```json
    {
      "items": [
        {
          "id": 1,
          "institution_id": 1,
          "institution_name": "Apex Institute of Technology & Science",
          "bureau": "Anti-Ragging Cell",
          "description": "Fictional case: Unauthorized late-night gathering reported near hostel.",
          "external_ref": "ARC-2026-0101",
          "category": "Disciplinary & Safety",
          "status": "open",
          "next_action": "Issue formal inquiry notice to chief warden",
          "due_date": "2026-10-29T21:15:00Z",
          "created_at": "2026-10-24T21:15:00Z",
          "updated_at": "2026-10-24T21:15:00Z"
        }
      ],
      "total": 1,
      "limit": 20,
      "offset": 0
    }
    ```
- **`POST /api/complaints`**
  - Files a new complaint against an existing institution. Returns HTTP 201 or HTTP 404 if `institution_id` does not exist.
  - Request body:
    ```json
    {
      "institution_id": 1,
      "bureau": "Student Welfare Cell",
      "description": "Drinking water filtration plant offline in residential block.",
      "category": "Infrastructure & Maintenance",
      "status": "open",
      "next_action": "Facility maintenance inspection dispatch scheduled"
    }
    ```
- **`GET /api/complaints/{id}`**
  - Returns single complaint record. Returns HTTP 404 if not found.
- **`PATCH /api/complaints/{id}`**
  - Updates mutable fields (`bureau`, `category`, `description`, `status`, `next_action`, `due_date`). Updates `updated_at` automatically. Primary key and `institution_id` cannot be modified.
  - Request body:
    ```json
    {
      "status": "under_investigation",
      "next_action": "Inspection underway"
    }
    ```

### 4. Dashboard Summary
- **`GET /api/dashboard/summary`**
  - Returns live database metrics.
  - Overdue rule: count of complaints where `due_date < now()` and status is NOT in terminal statuses (`resolved`, `dismissed`, `closed`).
  - Response (HTTP 200):
    ```json
    {
      "total_institutions": 5,
      "total_complaints": 10,
      "status_counts": {
        "open": 5,
        "under_investigation": 3,
        "resolved": 1,
        "closed": 1
      },
      "bureau_counts": {
        "Anti-Ragging Cell": 2,
        "Student Welfare Cell": 2,
        "Fee Regulation Cell": 2,
        "Examinations Bureau": 2,
        "Women Grievance Cell": 2
      },
      "overdue_complaints": 2
    }
    ```

### 5. Interactive API Documentation
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`
- **OpenAPI JSON Schema**: `http://127.0.0.1:8000/openapi.json`

---

## Relationship-Pair Integrity & SQLite Migration Note

In Phase 1, relationship records could theoretically be persisted in both forward `(a, b)` and reverse `(b, a)` order.

### Phase 2 Fix
1. **Database Check Constraint**:
   `CheckConstraint("complaint_a_id < complaint_b_id", name="check_complaint_canonical_order")`
   This ensures `complaint_a_id` is strictly lower than `complaint_b_id`. It blocks self-referential pairs and makes storing reverse pairs impossible at the database level.
2. **Service Layer Normalization**:
   [`app.services.relationship_service.create_or_get_relationship()`](file:///D:/Nexus/backend/app/services/relationship_service.py) automatically orders inputs as `min(id1, id2), max(id1, id2)` and rejects self-pairs.

### SQLite Migration Approach
SQLite does not support altering constraints on existing tables via `ALTER TABLE`. SQLAlchemy `create_all()` is idempotent and applies the constraint to newly created databases, but will not modify an already existing table.
- **For fresh setups**: The constraint is applied automatically on first startup.
- **For existing development databases**: Run the controlled migration utility [`app/db/migrate.py`](file:///D:/Nexus/backend/app/db/migrate.py), which automatically creates a pre-migration backup (`nexus.db.bak`) and executes a non-destructive SQLite table rebuild transaction:
  ```bash
  cd backend
  python app/db/migrate.py
  ```
  Alternatively, if local development data is disposable, deleting `backend/nexus.db` and restarting will recreate the schema fresh.

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
