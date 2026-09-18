from __future__ import annotations

import logging
import shutil
from pathlib import Path

from app.audio_enhancements import OUTPUT_FORMATS, build_filter_chain
from app.core.config import Settings, get_settings
from app.core.errors import ApiError, DownloadCancelled
from app.core.security import sanitize_filename
from app.media import mime_type_for, probe_duration_seconds, run_ffmpeg, validate_media
from app.models import JobRecord
from app.progress import JobProgressReporter
from app.runtime import Runtime, build_runtime
from app.schemas import JobStatus

logger = logging.getLogger("vidleaf.audio")


def _processing_callback(reporter: JobProgressReporter, message: str):
    def callback(fraction: float) -> None:
        reporter.update(
            JobStatus.MERGING,
            message,
            progress=round(10 + (85 * min(1.0, max(0.0, fraction))), 2),
            speed_bytes_per_second=None,
            eta_seconds=None,
        )

    return callback


def _mark_failed(reporter: JobProgressReporter, error: ApiError) -> None:
    if reporter.cancelled():
        return
    reporter.update(
        JobStatus.FAILED,
        error.message,
        error_code=error.code,
        error_message=error.message,
        error_details=error.details,
        speed_bytes_per_second=None,
        eta_seconds=None,
    )


def run_audio_clean_job(
    job_id: str,
    *,
    runtime: Runtime | None = None,
    settings: Settings | None = None,
) -> None:
    """Worker task: apply the selected cleanup filters to an uploaded audio file."""

    settings = settings or get_settings()
    owns_runtime = runtime is None
    runtime = runtime or build_runtime(settings)
    reporter = JobProgressReporter(runtime.repository, job_id)
    job: JobRecord | None = runtime.repository.get(job_id)
    if not job or reporter.cancelled():
        return
    work_dir: Path | None = None
    try:
        source = Path(job.source_path or "")
        if not source.is_file():
            raise ApiError("UPLOAD_MISSING", "The uploaded audio file is no longer available.", status_code=410)
        work_dir = source.parent

        reporter.update(JobStatus.ANALYZING, "Inspecting the uploaded audio", progress=2)
        duration = probe_duration_seconds(source, timeout_seconds=settings.provider_socket_timeout_seconds)
        codec, extension = OUTPUT_FORMATS[job.output_format or "mp3"]
        chain = build_filter_chain(job.enhancements)
        reporter.update(
            JobStatus.ANALYZING,
            "Cleanup plan ready",
            progress=8,
            duration_seconds=duration,
            title=job.source_filename,
            container=extension,
        )
        reporter.ensure_active()

        output = work_dir / f"cleaned.{extension}"
        arguments = ["-i", str(source), "-vn", "-af", chain]
        if codec == "pcm_s16le":
            arguments += ["-c:a", codec]
        else:
            arguments += ["-c:a", codec, "-b:a", f"{job.audio_bitrate_kbps or 192}k"]
        arguments += [str(output)]

        message = "Cleaning your audio"
        reporter.update(JobStatus.MERGING, message, progress=10)
        run_ffmpeg(
            arguments,
            duration_seconds=duration,
            timeout_seconds=settings.ffmpeg_timeout_seconds,
            on_progress=_processing_callback(reporter, message),
            cancelled=reporter.cancelled,
        )

        reporter.ensure_active()
        reporter.update(JobStatus.VALIDATING, "Validating the cleaned file", progress=97)
        validate_media(
            output,
            require_video=False,
            require_audio=True,
            timeout_seconds=settings.provider_socket_timeout_seconds,
        )
        stem = Path(job.source_filename or "cleaned-audio").stem
        filename = sanitize_filename(f"{stem} (cleaned)", extension)
        stored = runtime.storage.store_completed(job_id, output, filename, mime_type_for(extension))
        reporter.update(
            JobStatus.READY,
            "Your cleaned audio is ready.",
            progress=100,
            downloaded_bytes=stored.size_bytes,
            total_bytes=stored.size_bytes,
            speed_bytes_per_second=None,
            eta_seconds=0,
            storage_key=stored.key,
            final_filename=stored.filename,
            final_size_bytes=stored.size_bytes,
            mime_type=stored.mime_type,
        )
        # The uploaded source is never kept once the cleaned output is stored.
        shutil.rmtree(work_dir, ignore_errors=True)
    except DownloadCancelled:
        current = runtime.repository.get(job_id)
        if current and current.status not in {JobStatus.CANCELLED, JobStatus.EXPIRED}:
            reporter.update(JobStatus.CANCELLED, "Audio cleanup cancelled.", speed_bytes_per_second=None, eta_seconds=None)
        runtime.storage.delete_job(job_id)
    except ApiError as error:
        _mark_failed(reporter, error)
        logger.warning("audio_clean_failed", extra={"job_id": job_id, "error_code": error.code})
        if work_dir:
            shutil.rmtree(work_dir, ignore_errors=True)
    except Exception:
        _mark_failed(reporter, ApiError("AUDIO_CLEAN_FAILED", "The worker could not clean this audio file.", status_code=502))
        logger.exception("unexpected_audio_failure", extra={"job_id": job_id})
        if work_dir:
            shutil.rmtree(work_dir, ignore_errors=True)
    finally:
        if owns_runtime:
            runtime.redis.close()
