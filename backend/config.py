import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_NAME: str = "Nipah Virus Awareness Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # LLM Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-3.5-turbo")

    # CORS
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")

    # ML Model path
    ML_MODEL_PATH: str = os.getenv(
        "ML_MODEL_PATH", os.path.join(os.path.dirname(__file__), "models", "blood_model.joblib")
    )

    # SQLite database path
    SQLITE_DB_PATH: str = os.getenv(
        "SQLITE_DB_PATH", os.path.join(os.path.dirname(__file__), "data", "nipah.db")
    )

    # Default admin/manager credentials
    DEFAULT_ADMIN_EMAIL: str = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@nipah.local")
    DEFAULT_ADMIN_PASSWORD: str = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
    DEFAULT_MANAGER_EMAIL: str = os.getenv("DEFAULT_MANAGER_EMAIL", "manager@nipah.local")
    DEFAULT_MANAGER_PASSWORD: str = os.getenv("DEFAULT_MANAGER_PASSWORD", "manager123")


settings = Settings()
