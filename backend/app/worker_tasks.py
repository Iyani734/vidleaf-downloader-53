from __future__ import annotations

import shutil
import logging
from pathlib import Path

from rq import get_current_job

from app.core.config import Settings
from app.core.config import get_settings
from app.core.errors import ApiError, DownloadCancelled
from app.core.security import sanitize_filename
from app.media import mime_type_for, run_ffmpeg, validate_media
from app.models import JobRecord
from app.progress import JobProgressReporter
from app.runtime import Runtime, build_runtime
from app.schemas import JobStatus

logger = logging.getLogger("vidleaf.worker")
_TRANSIENT_ERROR_CODES = {"PROVIDER_THROTTLED", "PROVIDER_ERROR"}


def _reserve_space(directory: Path, estimated_bytes: int | None, minimum_free_bytes: int) -> None:
    # During merge, source video + source audio + final file can coexist. Reserve 3x estimate.
    needed = max(minimum_free_bytes, (estimated_bytes or minimum_free_bytes) * 3)
    available = shutil.disk_usage(directory).free
    if available < needed:
        raise ApiError(
            "INSUFFICIENT_DISK_SPACE",
            "The worker does not have enough temporary disk space for this download.",
            status_code=503,
            details={"requiredBytes": needed, "availableBytes": available},
        )


def _processing_callback(reporter: JobProgressReporter, message: str):
    def callback(fraction: float) -> None:
        reporter.update(
            JobStatus.MERGING,
            message,
            progress=round(85 + (13 * min(1.0, max(0.0, fraction))), 2),
            speed_bytes_per_second=None,
            eta_seconds=None,
        )

    return callback


def _move_or_process(
    *,
    work_dir: Path,
    selection,
    video_path: Path | None,
    audio_path: Path | None,
    duration_seconds: int | None,
    audio_bitrate_kbps: int | None,
    reporter: JobProgressReporter,
    ffmpeg_timeout_seconds: int,
) -> Path:
    output = work_dir / f"final.{selection.output_extension}"
    if selection.public_format.has_video:
        if not video_path:
            raise ApiError("DOWNLOAD_FAILED", "The video stream is missing.", status_code=502)
        arguments = ["-i", str(video_path)]
        if audio_path:
            arguments += ["-i", str(audio_path), "-map", "0:v:0", "-map", "1:a:0"]
        else:
            arguments += ["-map", "0:v:0", "-map", "0:a:0"]
        arguments += ["-c", "copy", str(output)]
        message = "Merging video and audio streams" if audio_path else "Finalizing media container"
    elif selection.audio_transcode:
        if not audio_path:
            raise ApiError("DOWNLOAD_FAILED", "The audio stream is missing.", status_code=502)
        bitrate = audio_bitrate_kbps or 192
        arguments = ["-i", str(audio_path), "-vn", "-c:a", "libmp3lame", "-b:a", f"{bitrate}k", str(output)]
        message = "Converting audio to MP3"
    else:
        if not audio_path:
            raise ApiError("DOWNLOAD_FAILED", "The audio stream is missing.", status_code=502)
        arguments = ["-i", str(audio_path), "-vn", "-c", "copy", str(output)]
        message = "Finalizing audio container"
    reporter.update(JobStatus.MERGING, message, progress=85)
    run_ffmpeg(
        arguments,
        duration_seconds=duration_seconds,
        timeout_seconds=ffmpeg_timeout_seconds,
        on_progress=_processing_callback(reporter, message),
        cancelled=reporter.cancelled,
    )
    return output


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


def run_download_job(
    job_id: str,
    *,
    runtime: Runtime | None = None,
    settings: Settings | None = None,
) -> None:
    """RQ task: download known streams, merge with FFmpeg, validate, then store privately."""

    settings = settings or get_settings()
    owns_runtime = runtime is None
    runtime = runtime or build_runtime(settings)
    reporter = JobProgressReporter(runtime.repository, job_id)
    job: JobRecord | None = runtime.repository.get(job_id)
    if not job or reporter.cancelled():
        return
    work_dir: Path | None = None
    try:
        if job.expires_at.timestamp() <= __import__("time").time():
            reporter.update(JobStatus.EXPIRED, "This download request has expired.", progress=0)
            return
        reporter.update(JobStatus.ANALYZING, "Analyzing available media streams", progress=1)
        info = runtime.provider.extract(job.source_url)
        analysis = runtime.provider.analyze(info)
        selection = runtime.provider.select(
            info,
            quality=job.quality,
            container=job.container,
            audio_format=job.audio_format,
            allow_quality_fallback=job.allow_quality_fallback,
        )
        if selection.public_format.estimated_size_bytes and selection.public_format.estimated_size_bytes > settings.maximum_file_size_bytes:
            raise ApiError(
                "FILE_SIZE_LIMIT_EXCEEDED",
                "The selected format exceeds the configured file-size limit.",
                status_code=422,
                details={"maximumFileSizeBytes": settings.maximum_file_size_bytes},
            )
        reporter.update(
            JobStatus.ANALYZING,
            "Media streams selected",
            progress=5,
            total_bytes=selection.public_format.estimated_size_bytes,
            title=analysis.title,
            thumbnail=analysis.thumbnail,
            channel=analysis.channel,
            duration_seconds=analysis.duration_seconds,
            quality=selection.public_format.quality,
            container=selection.output_extension,
        )
        work_dir = runtime.storage.working_directory(job_id)
        _reserve_space(work_dir, selection.public_format.estimated_size_bytes, settings.minimum_free_disk_bytes)
        reporter.ensure_active()

        video_path: Path | None = None
        audio_path: Path | None = None
        video_completed = 0
        if selection.video_format_id:
            def video_progress(downloaded: int, total: int | None, speed: int | None, eta: int | None) -> None:
                reporter.stream_progress(
                    status=JobStatus.DOWNLOADING_VIDEO,
                    message="Downloading video stream",
                    stage_start=5,
                    stage_end=70 if selection.audio_format_id else 85,
                    downloaded=downloaded,
                    total=total,
                    speed=speed,
                    eta=eta,
                )

            reporter.update(JobStatus.DOWNLOADING_VIDEO, "Downloading video stream", progress=5)
            video_path = runtime.provider.download_format(
                job.source_url,
                selection.video_format_id,
                work_dir,
                "video",
                on_progress=video_progress,
                cancelled=reporter.cancelled,
            )
            video_completed = video_path.stat().st_size

        if selection.audio_format_id:
            def audio_progress(downloaded: int, total: int | None, speed: int | None, eta: int | None) -> None:
                reporter.stream_progress(
                    status=JobStatus.DOWNLOADING_AUDIO,
                    message="Downloading audio stream",
                    stage_start=70 if selection.video_format_id else 5,
                    stage_end=85,
                    downloaded=video_completed + downloaded,
                    total=(video_completed + total) if total else None,
                    speed=speed,
                    eta=eta,
                )

            reporter.update(JobStatus.DOWNLOADING_AUDIO, "Downloading audio stream", progress=70 if selection.video_format_id else 5)
            audio_path = runtime.provider.download_format(
                job.source_url,
                selection.audio_format_id,
                work_dir,
                "audio",
                on_progress=audio_progress,
                cancelled=reporter.cancelled,
            )

        output = _move_or_process(
            work_dir=work_dir,
            selection=selection,
            video_path=video_path,
            audio_path=audio_path,
            duration_seconds=analysis.duration_seconds,
            audio_bitrate_kbps=job.audio_bitrate_kbps,
            reporter=reporter,
            ffmpeg_timeout_seconds=settings.ffmpeg_timeout_seconds,
        )
        reporter.ensure_active()
        reporter.update(JobStatus.VALIDATING, "Validating final media file", progress=98)
        validate_media(
            output,
            require_video=selection.public_format.has_video,
            require_audio=True,
            timeout_seconds=settings.provider_socket_timeout_seconds,
        )
        final_size = output.stat().st_size
        if final_size > settings.maximum_file_size_bytes:
            raise ApiError("FILE_SIZE_LIMIT_EXCEEDED", "The final file exceeds the configured file-size limit.", status_code=422)
        filename = sanitize_filename(analysis.title, selection.output_extension)
        stored = runtime.storage.store_completed(job_id, output, filename, mime_type_for(selection.output_extension))
        reporter.update(
            JobStatus.READY,
            "Your download is ready.",
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
        # The completed object has been moved/uploaded; never retain separate source streams.
        shutil.rmtree(work_dir, ignore_errors=True)
    except DownloadCancelled:
        current = runtime.repository.get(job_id)
        if current and current.status not in {JobStatus.CANCELLED, JobStatus.EXPIRED}:
            reporter.update(JobStatus.CANCELLED, "Download cancelled.", speed_bytes_per_second=None, eta_seconds=None)
        if work_dir:
            runtime.storage.delete_job(job_id)
    except ApiError as error:
        rq_job = get_current_job()
        retries_left = int(getattr(rq_job, "retries_left", 0) or 0) if rq_job else 0
        if error.code in _TRANSIENT_ERROR_CODES and retries_left > 0 and not reporter.cancelled():
            retrying = reporter.current()
            reporter.update(
                JobStatus.QUEUED,
                "Temporary provider issue; retrying with exponential backoff.",
                attempt=retrying.attempt + 1,
                speed_bytes_per_second=None,
                eta_seconds=None,
            )
            logger.warning(
                "temporary_download_failure",
                extra={
                    "job_id": job_id,
                    "error_code": error.code,
                    "error_message": error.message,
                    "status_code": error.status_code,
                },
            )
            raise RuntimeError(error.code) from error
        _mark_failed(reporter, error)
        logger.warning(
            "download_failed",
            extra={
                "job_id": job_id,
                "error_code": error.code,
                "error_message": error.message,
                "status_code": error.status_code,
            },
        )
        if work_dir:
            shutil.rmtree(work_dir, ignore_errors=True)
    except Exception:
        _mark_failed(
            reporter,
            ApiError("DOWNLOAD_FAILED", "The download worker encountered an unexpected error.", status_code=502),
        )
        logger.exception("unexpected_download_failure", extra={"job_id": job_id})
        if work_dir:
            shutil.rmtree(work_dir, ignore_errors=True)
    finally:
        if owns_runtime:
            runtime.redis.close()
