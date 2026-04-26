"""ColdTrace backend configuration."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    demo_mode: bool = True

    # OpenTopography
    opentopography_api_key: str = ""

    # Sentinel Hub
    sentinel_hub_client_id: str = ""
    sentinel_hub_client_secret: str = ""

    # Database
    database_url: str = "postgresql://coldtrace:coldtrace@localhost:5432/coldtrace"

    # Auth
    secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "https://coldtrace.oaudrey.com"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
