from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Secrets belong in the environment, never source control."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"
    app_name: str = "VidLeaf API"
    api_prefix: str = "/api/v1"
    log_level: str = "INFO"
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
        ]
    )
    queue_backend: str = "redis"
    redis_url: str = "redis://redis:6379/0"
    redis_key_prefix: str = "vidleaf"
    data_dir: Path = Path("/var/lib/vidleaf")
    storage_backend: str = "local"
    s3_bucket: str | None = None
    s3_endpoint_url: str | None = None
    s3_region: str = "us-east-1"
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    download_token_secret: str = "development-only-change-me-please"
    secure_cookies: bool = False
    session_cookie_name: str = "vidleaf_session"
    max_request_bytes: int = 16_384
    rate_limit_per_minute: int = 30
    analysis_cache_seconds: int = 600
    job_expiry_seconds: int = 3_600
    expired_record_retention_seconds: int = 300
    download_token_seconds: int = 300
    maximum_duration_seconds: int = 14_400
    maximum_file_size_bytes: int = 10 * 1024 * 1024 * 1024
    minimum_free_disk_bytes: int = 3 * 1024 * 1024 * 1024
    worker_max_jobs: int = 2
    worker_job_timeout_seconds: int = 14_400
    provider_socket_timeout_seconds: int = 30
    youtube_player_clients: list[str] = Field(default_factory=list)
    youtube_cookies_file: Path | None = None
    youtube_js_runtime: str | None = None
    youtube_remote_components: list[str] = Field(default_factory=list)
    ffmpeg_timeout_seconds: int = 3_600
    cleanup_orphan_age_seconds: int = 86_400

    @field_validator("cors_origins", "youtube_player_clients", "youtube_remote_components", mode="before")
    @classmethod
    def split_csv_list(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("youtube_cookies_file", mode="before")
    @classmethod
    def empty_path_to_none(cls, value: str | Path | None) -> str | Path | None:
        if value == "":
            return None
        return value

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
