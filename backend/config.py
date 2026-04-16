"""Application settings loaded from environment (Supabase/Redis URLs)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    redis_url: str = "redis://localhost:6379/0"
    cache_ttl_seconds: int = 60
    cors_origins: str = "http://localhost:3000"

    # PostgreSQL (optional — API falls back to in-memory mock when unset)
    database_url: str | None = None

    # Riot API (batch jobs / optional live validation)
    riot_api_key: str | None = None
    riot_platform: str = "euw1"
    riot_regional: str = "europe"
    arena_queue_ids: str = "1700"

    # Dev: force mock recommendations even when DB is configured
    use_mock_recommendations: bool = False


settings = Settings()
