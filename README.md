# Nexus

Nexus is an institutional complaint tracking and intelligence prototype designed to monitor, link, and analyze complaint cases across multiple bureaus, ombudsman cells, and administrative bodies.

## Phase 1 Scope & Limitations

### Current Scope (Phase 1: Foundation)
- Clean, modular backend foundation using **FastAPI**, **SQLAlchemy 2.x**, and **SQLite**.
- Centralized configuration with sensible local defaults using `pydantic-settings`.
- Predictable backend-local SQLite persistence (`backend/nexus.db`) with environment variable override support (`DATABASE_URL`).
- Core SQLAlchemy declarative models:
  - `Institution`: Canonical educational/monitored organizations and aliases.
  - `Complaint`: Cross-bureau complaints with non-unique external references, status, and deadlines.
  - `Relationship`: Similarity and correlation links between complaint pairs (without merging records) with distinctness check constraints.
  - `AuditEvent`: Decoupled audit logging recording system and user actions across entities.
- Idempotent schema initialization on application lifespan startup.
- Health probe endpoint at `/api/health` verifying both service availability and live database connectivity.
- Interactive OpenAPI documentation (Swagger UI at `/docs`, ReDoc at `/redoc`).
- Automated pytest test suite operating against an isolated in-memory SQLite database.

### Current Limitations
- CRUD endpoints for institutions, complaints, and relationships are not yet implemented (scheduled for Phase 2).
- Automated AI/NLP complaint matching algorithms, cross-cell correlation engines, and CSV import pipelines are not yet attached.
- Authentication, role-based authorization, and user management are not implemented in this phase.
- Demo data only: No real institutional records or personal data are stored or processed.

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

Nexus is designed to run locally out-of-the-box without requiring a `.env` file. Safe defaults are provided in code:
- **Default SQLite Database**: `backend/nexus.db` (resolved predictably regardless of working directory).
- **Environment**: `development`.
- **API Prefix**: `/api`.

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

### Endpoints
- **Service Base URL**: `http://127.0.0.1:8000`
- **Health Check**: `http://127.0.0.1:8000/api/health`
  - Returns HTTP 200:
    ```json
    {
      "status": "ok",
      "service": "nexus-backend"
    }
    ```
- **Interactive API Documentation (Swagger UI)**: `http://127.0.0.1:8000/docs`
- **Alternative Documentation (ReDoc)**: `http://127.0.0.1:8000/redoc`
- **OpenAPI JSON Schema**: `http://127.0.0.1:8000/openapi.json`

---

## Running Automated Tests

Run the test suite using `pytest`. Tests use an isolated, in-memory SQLite database (`sqlite:///:memory:`) and never modify the developer's local `nexus.db` file.

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
