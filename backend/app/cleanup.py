from __future__ import annotations

import logging

from app.core.config import get_settings
from app.runtime import build_runtime
from app.schemas import JobStatus

logger = logging.getLogger(__name__)


def cleanup_expired_jobs() -> int:
    """Mark expired records, remove private files, then clear their Redis expiry index."""

    settings = get_settings()
    runtime = build_runtime(settings)
    removed = 0
    try:
        for job_id in runtime.repository.expired_job_ids():
            job = runtime.repository.get(job_id)
            if job:
                job.status = JobStatus.EXPIRED
                job.message = "This download has expired and its file was removed."
                runtime.repository.publish(job, "expired")
                runtime.storage.delete_job(job.job_id, job.storage_key)
                removed += 1
            runtime.repository.remove_expiry_index(job_id)
        removed += runtime.storage.cleanup_orphans(settings.cleanup_orphan_age_seconds)
        return removed
    finally:
        runtime.redis.close()


if __name__ == "__main__":
    logging.basicConfig(level="INFO")
    logger.info("Cleaned %s expired VidLeaf directories/records", cleanup_expired_jobs())
