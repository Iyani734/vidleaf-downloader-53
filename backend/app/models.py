from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from pydantic import Field

from app.schemas import ApiModel, DownloadJobResponse, JobStatus


def utc_now() -> datetime:
    return datetime.now(UTC)


class JobRecord(ApiModel):
    job_id: str
    owner_id: str
    source_url: str
    quality: str
    container: str
    job_type: str = "download"
    enhancements: list[str] = Field(default_factory=list)
    source_filename: str | None = None
    source_path: str | None = None
    output_format: str | None = None
    audio_format: str | None = None
    audio_bitrate_kbps: int | None = None
    allow_quality_fallback: bool = False
    status: JobStatus = JobStatus.QUEUED
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime
    progress: float = 0
    downloaded_bytes: int = 0
    total_bytes: int | None = None
    speed_bytes_per_second: int | None = None
    eta_seconds: int | None = None
    message: str | None = "Queued for download"
    title: str | None = None
    thumbnail: str | None = None
    channel: str | None = None
    duration_seconds: int | None = None
    error_code: str | None = None
    error_message: str | None = None
    error_details: dict[str, Any] = Field(default_factory=dict)
    task_id: str | None = None
    storage_key: str | None = None
    final_filename: str | None = None
    mime_type: str | None = None
    final_size_bytes: int | None = None
    attempt: int = 0

    @classmethod
    def new(
        cls,
        *,
        job_id: str,
        owner_id: str,
        source_url: str,
        quality: str,
        container: str,
        audio_format: str | None = None,
        audio_bitrate_kbps: int | None = None,
        allow_quality_fallback: bool = False,
        expiry_seconds: int,
        job_type: str = "download",
        enhancements: list[str] | None = None,
        source_filename: str | None = None,
        source_path: str | None = None,
        output_format: str | None = None,
    ) -> "JobRecord":
        now = utc_now()
        return cls(
            job_id=job_id,
            owner_id=owner_id,
            source_url=source_url,
            quality=quality,
            container=container,
            audio_format=audio_format,
            audio_bitrate_kbps=audio_bitrate_kbps,
            allow_quality_fallback=allow_quality_fallback,
            job_type=job_type,
            enhancements=enhancements or [],
            source_filename=source_filename,
            source_path=source_path,
            output_format=output_format,
            created_at=now,
            updated_at=now,
            expires_at=now + timedelta(seconds=expiry_seconds),
            message="Queued for audio cleanup" if job_type == "audio_clean" else "Queued for download",
        )

    def response(self) -> DownloadJobResponse:
        return DownloadJobResponse(
            job_id=self.job_id,
            status=self.status,
            quality=self.quality,
            container=self.container,
            job_type=self.job_type,
            enhancements=self.enhancements,
            source_filename=self.source_filename,
            final_filename=self.final_filename,
            final_size_bytes=self.final_size_bytes,
            estimated_size_bytes=self.total_bytes,
            created_at=self.created_at,
            updated_at=self.updated_at,
            expires_at=self.expires_at,
            progress=self.progress,
            downloaded_bytes=self.downloaded_bytes,
            total_bytes=self.total_bytes,
            speed_bytes_per_second=self.speed_bytes_per_second,
            eta_seconds=self.eta_seconds,
            message=self.message,
            title=self.title,
            thumbnail=self.thumbnail,
            error_code=self.error_code,
            error_message=self.error_message,
        )
