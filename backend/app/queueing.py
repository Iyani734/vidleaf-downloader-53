from __future__ import annotations

import threading
from typing import TYPE_CHECKING

from redis import Redis
from rq import Queue, Retry

from app.core.config import Settings

if TYPE_CHECKING:
    from app.runtime import Runtime


class DownloadQueue:
    """Thin RQ boundary so API requests never perform media work."""

    def __init__(self, redis: Redis, settings: Settings) -> None:
        self.queue = Queue(
            "downloads",
            connection=redis,
            default_timeout=settings.worker_job_timeout_seconds,
        )
        self.settings = settings

    def enqueue(self, job_id: str) -> str:
        from app.worker_tasks import run_download_job

        queued = self.queue.enqueue(
            run_download_job,
            job_id,
            job_timeout=self.settings.worker_job_timeout_seconds,
            retry=Retry(max=2, interval=[15, 60]),
            result_ttl=600,
            failure_ttl=86_400,
        )
        return queued.id

    def cancel_queued(self, task_id: str | None) -> None:
        if not task_id:
            return
        from rq.job import Job

        try:
            Job.fetch(task_id, connection=self.queue.connection).cancel()
        except Exception:
            # A worker may already have claimed it; its checked progress hooks will stop it.
            return


class _LocalQueueInfo:
    def __init__(self, owner: ThreadedDownloadQueue) -> None:
        self.owner = owner

    @property
    def count(self) -> int:
        return sum(1 for thread in self.owner.threads.values() if thread.is_alive())


class ThreadedDownloadQueue:
    """Development-only queue that runs jobs in this API process."""

    def __init__(self, runtime: Runtime, settings: Settings) -> None:
        self.runtime = runtime
        self.settings = settings
        self.threads: dict[str, threading.Thread] = {}
        self.queue = _LocalQueueInfo(self)

    def enqueue(self, job_id: str) -> str:
        from app.worker_tasks import run_download_job

        task_id = f"local_{job_id}"
        thread = threading.Thread(
            target=run_download_job,
            kwargs={"job_id": job_id, "runtime": self.runtime, "settings": self.settings},
            name=task_id,
            daemon=True,
        )
        self.threads[task_id] = thread
        thread.start()
        return task_id

    def cancel_queued(self, task_id: str | None) -> None:
        # Running media work cannot be force-stopped safely from another thread. The worker's
        # progress hooks notice the cancelled job state and stop at the next cancellation check.
        return None
