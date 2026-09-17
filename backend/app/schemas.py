from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(item.capitalize() for item in tail)


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, use_enum_values=True)


class JobStatus(StrEnum):
    QUEUED = "queued"
    ANALYZING = "analyzing"
    DOWNLOADING_VIDEO = "downloading_video"
    DOWNLOADING_AUDIO = "downloading_audio"
    MERGING = "merging"
    VALIDATING = "validating"
    READY = "ready"
    FAILED = "failed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


TERMINAL_JOB_STATUSES = {JobStatus.READY, JobStatus.FAILED, JobStatus.CANCELLED, JobStatus.EXPIRED}


class VideoFormat(ApiModel):
    id: str
    quality: str
    label: str
    width: int | None = None
    height: int | None = None
    fps: float | None = None
    container: Literal["mp4", "webm", "m4a", "mp3"]
    video_codec: str | None = None
    audio_codec: str | None = None
    has_video: bool
    has_audio: bool
    requires_merge: bool = False
    requires_processing: bool = False
    estimated_size_bytes: int | None = None
    size_is_approximate: bool = False
    recommended: bool = False


class VideoMetadata(ApiModel):
    video_id: str
    title: str
    channel: str | None = None
    thumbnail: str | None = None
    duration_seconds: int | None = None
    upload_date: str | None = None
    is_live: bool = False
    views: int | None = None


class AnalysisRequest(ApiModel):
    url: str = Field(min_length=10, max_length=2_048, examples=["https://www.youtube.com/watch?v=dQw4w9WgXcQ"])


class AnalysisResponse(VideoMetadata):
    formats: list[VideoFormat]


class DownloadRequest(ApiModel):
    url: str = Field(min_length=10, max_length=2_048)
    quality: Literal["best", "2160p", "1440p", "1080p", "720p", "480p", "360p", "audio"] = "best"
    container: Literal["mp4", "webm"] | None = "mp4"
    audio_format: Literal["best", "m4a", "mp3"] | None = None
    audio_bitrate_kbps: Literal[128, 192, 320] = 192
    allow_quality_fallback: bool = False


class ErrorPayload(ApiModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
    request_id: str


class ErrorResponse(ApiModel):
    error: ErrorPayload


class DownloadJobResponse(ApiModel):
    job_id: str
    status: JobStatus
    quality: str
    container: str
    estimated_size_bytes: int | None = None
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    progress: float = 0
    downloaded_bytes: int = 0
    total_bytes: int | None = None
    speed_bytes_per_second: int | None = None
    eta_seconds: int | None = None
    message: str | None = None
    title: str | None = None
    thumbnail: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    download_url: str | None = None
    download_token_expires_at: datetime | None = None


class CreateDownloadResponse(ApiModel):
    job_id: str
    status: JobStatus
    quality: str
    container: str
    estimated_size_bytes: int | None = None
    created_at: datetime


class JobListResponse(ApiModel):
    jobs: list[DownloadJobResponse]


class HealthResponse(ApiModel):
    status: Literal["live", "ready"]
