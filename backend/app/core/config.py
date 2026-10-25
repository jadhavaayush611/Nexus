from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve absolute path to the backend root directory
CORE_DIR = Path(__file__).resolve().parent
APP_DIR = CORE_DIR.parent
BACKEND_DIR = APP_DIR.parent

# Predictable backend-local default SQLite file location
DEFAULT_DB_FILE = BACKEND_DIR / "nexus.db"
DEFAULT_DATABASE_URL = f"sqlite:///{DEFAULT_DB_FILE.as_posix()}"


class Settings(BaseSettings):
    """Nexus application settings with sensible local-development defaults."""

    PROJECT_NAME: str = "Nexus Backend"
    VERSION: str = "0.2.0"
    DESCRIPTION: str = (
        "Backend prototype for monitoring and tracking institution-related "
        "complaint cases across multiple bureaus/cells."
    )
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"

    # Database configuration with support for environment variable overrides
    DATABASE_URL: str = DEFAULT_DATABASE_URL

    # Configurable CORS allowlist for local frontend dev servers
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
