from __future__ import annotations

from app.core.errors import DownloadCancelled
from app.models import JobRecord
from app.repositories import RedisJobRepository
from app.schemas import JobStatus


class JobProgressReporter:
    def __init__(self, repository: RedisJobRepository, job_id: str) -> None:
        self.repository = repository
        self.job_id = job_id

    def current(self) -> JobRecord:
        job = self.repository.get(self.job_id)
        if not job:
            raise DownloadCancelled()
        return job

    def cancelled(self) -> bool:
        job = self.repository.get(self.job_id)
        return not job or job.status in {JobStatus.CANCELLED, JobStatus.EXPIRED}

    def ensure_active(self) -> None:
        if self.cancelled():
            raise DownloadCancelled()

    def update(self, status: JobStatus, message: str, **fields: object) -> JobRecord:
        job = self.current()
        if job.status in {JobStatus.CANCELLED, JobStatus.EXPIRED} and status != job.status:
            raise DownloadCancelled()
        job.status = status
        job.message = message
        for name, value in fields.items():
            setattr(job, name, value)
        self.repository.publish(job, "status")
        return job

    def stream_progress(
        self,
        *,
        status: JobStatus,
        message: str,
        stage_start: float,
        stage_end: float,
        downloaded: int,
        total: int | None,
        speed: int | None,
        eta: int | None,
    ) -> JobRecord:
        self.ensure_active()
        fraction = min(1.0, downloaded / total) if total and total > 0 else 0.0
        overall = round(stage_start + ((stage_end - stage_start) * fraction), 2)
        return self.update(
            status,
            message,
            progress=overall,
            downloaded_bytes=downloaded,
            total_bytes=total or self.current().total_bytes,
            speed_bytes_per_second=speed,
            eta_seconds=eta,
        )
