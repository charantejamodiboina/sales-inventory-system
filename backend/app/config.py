import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Sales & Inventory Management System"
    API_V1_PREFIX: str = "/api"
    SECRET_KEY: str = os.getenv("JWT_SECRET", "super-secret-sales-inventory-jwt-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for demo ease
    
    # Database: Default to MySQL if available, with seamless SQLite fallback
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./sales_inventory.db"
    )
    
    # SMTP / MailHog Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "127.0.0.1")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "1025"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "system@salesinventory.demo")
    SMTP_ENABLED: bool = os.getenv("SMTP_ENABLED", "True").lower() in ("true", "1", "yes")

    # Manager Approval default threshold (e.g. ₹10,000)
    DEFAULT_APPROVAL_THRESHOLD: float = float(os.getenv("DEFAULT_APPROVAL_THRESHOLD", "10000.00"))

settings = Settings()

