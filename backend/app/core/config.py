from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Clevio Agent Pro API"

    # Security
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # ~30 days

    # Database
    DATABASE_URL: str = Field(..., env="DATABASE_URL")

    # Redis
    REDIS_URL: str = Field(..., env="REDIS_URL")

    # Google OAuth
    GOOGLE_CLIENT_ID: str = Field(..., env="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str = Field(..., env="GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: str = Field(..., env="GOOGLE_REDIRECT_URI")

    # OpenAI
    OPENAI_API_KEY: str = Field(..., env="OPENAI_API_KEY")

    # Midtrans Payment Gateway
    MIDTRANS_SERVER_KEY: str = Field(..., env="MIDTRANS_SERVER_KEY")
    MIDTRANS_CLIENT_KEY: str = Field(..., env="MIDTRANS_CLIENT_KEY")
    MIDTRANS_IS_PRODUCTION: bool = Field(False, env="MIDTRANS_IS_PRODUCTION")

    # Agent Configuration
    MAX_CONCURRENT_AGENTS: int = Field(10000, env="MAX_CONCURRENT_AGENTS")
    AGENT_EXECUTION_TIMEOUT: int = Field(300, env="AGENT_EXECUTION_TIMEOUT")

    # CORS - FIX THIS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "https://5qv3wb2p-3000.asse.devtunnels.ms",
        "http://localhost:8000",
        "https://5qv3wb2p-8000.asse.devtunnels.ms"
    ]

    # Logging
    LOG_LEVEL: str = Field("INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = Field("json", env="LOG_FORMAT")

    class Config:
        env_file = ".env"


settings = Settings()
