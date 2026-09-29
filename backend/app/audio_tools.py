"""Phase 1 audio tools: MP4 -> MP3, audio cutter and audio compressor.

All three reuse the shared upload handling, job repository, progress reporter,
FFmpeg runner, validation and private storage used by the downloader.
"""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

from app.core.config import Settings, get_settings
from app.core.errors import ApiError, DownloadCancelled
from app.core.security import sanitize_filename
from app.media import mime_type_for, probe_duration_seconds, run_ffmpeg, validate_media
from app.models import JobRecord
from app.progress import JobProgressReporter
from app.runtime import Runtime, build_runtime
from app.schemas import JobStatus

logger = logging.getLogger("vidleaf.audio_tools")

TOOLS = {"mp4-to-mp3", "cut", "compress"}
VIDEO_EXTENSIONS = {"mp4", "m4v", "mov"}
AUDIO_EXTENSIONS = {"mp3", "wav", "m4a", "flac", "ogg", "aac", "opus"}
ALLOWED_INPUTS = {
    "mp4-to-mp3": VIDEO_EXTENSIONS,
    "cut": AUDIO_EXTENSIONS,
    "compress": AUDIO_EXTENSIONS | {"mp4"},
}
MP3_BITRATES = {32, 48, 64, 96, 128, 160, 192, 256, 320}
COMPRESS_PRESETS = {"small": 112, "balanced": 176, "high": 288}
MIN_TARGET_KBPS = 32
MAX_TARGET_KBPS = 320

# Output format for cuts keeps the source format when possible.
_CUT_CODECS: dict[str, tuple[str, str, list[str]]] = {
    "mp3": ("mp3", "libmp3lame", ["-b:a", "192k"]),
    "wav": ("wav", "pcm_s16le", []),
    "flac": ("flac", "flac", []),
    "ogg": ("ogg", "libvorbis", ["-q:a", "5"]),
    "opus": ("ogg", "libvorbis", ["-q:a", "5"]),
    "m4a": ("m4a", "aac", ["-b:a", "192k"]),
    "aac": ("m4a", "aac", ["-b:a", "192k"]),
}


def bitrate_for_target(target_bytes: int, duration_seconds: float) -> int:
    """Pick an MP3 bitrate that lands just under the requested file size."""

    if duration_seconds <= 0:
        raise ApiError("DURATION_UNKNOWN", "We couldn't read this file's length to hit a target size.", status_code=422)
    # Leave ~3% headroom for MP3 framing / ID3 overhead.
    kbps = int((target_bytes * 8 * 0.97) / duration_seconds / 1000)
    if kbps < MIN_TARGET_KBPS:
        raise ApiError(
            "TARGET_TOO_SMALL",
            "That target size is too small for this recording. Try a larger size.",
            status_code=422,
        )
    return min(MAX_TARGET_KBPS, kbps)


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


def _plan(job: JobRecord, source: Path, duration: float | None, work_dir: Path) -> tuple[list[str], Path, str, float | None, str]:
    stem = Path(job.source_filename or "audio").stem
    if job.tool == "mp4-to-mp3":
        bitrate = job.audio_bitrate_kbps or 192
        output = work_dir / "output.mp3"
        args = ["-i", str(source), "-vn", "-map", "0:a:0", "-c:a", "libmp3lame", "-b:a", f"{bitrate}k", str(output)]
        return args, output, sanitize_filename(stem, "mp3"), duration, "Converting to MP3"

    if job.tool == "cut":
        start = (job.trim_start_ms or 0) / 1000
        end = (job.trim_end_ms or 0) / 1000
        if duration is not None:
            end = min(end, float(duration) + 1)
        if end - start < 0.1:
            raise ApiError("INVALID_SELECTION", "The selection is too short. Choose at least a tenth of a second.", status_code=422)
        if duration is not None and start >= duration:
            raise ApiError("INVALID_SELECTION", "The start time is after the end of the audio.", status_code=422)
        ext = source.suffix.lstrip(".").lower()
        out_ext, codec, extra = _CUT_CODECS.get(ext, _CUT_CODECS["mp3"])
        output = work_dir / f"output.{out_ext}"
        # Re-encode for sample-accurate cuts; input seeking keeps long files fast.
        args = ["-ss", f"{start:.3f}", "-i", str(source), "-t", f"{end - start:.3f}", "-vn", "-map", "0:a:0", "-c:a", codec, *extra, str(output)]
        return args, output, sanitize_filename(f"{stem} (cut)", out_ext), end - start, "Cutting your audio"

    if job.tool == "compress":
        if job.target_bytes:
            bitrate = bitrate_for_target(job.target_bytes, float(duration or 0))
        else:
            bitrate = job.audio_bitrate_kbps or 176
        output = work_dir / "output.mp3"
        args = ["-i", str(source), "-vn", "-map", "0:a:0", "-c:a", "libmp3lame", "-b:a", f"{bitrate}k", str(output)]
        return args, output, sanitize_filename(f"{stem} (compressed)", "mp3"), duration, "Compressing your audio"

    raise ApiError("UNSUPPORTED_TOOL", "This audio tool is not available.", status_code=422)


def run_audio_tool_job(job_id: str, *, runtime: Runtime | None = None, settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    owns_runtime = runtime is None
    runtime = runtime or build_runtime(settings)
    reporter = JobProgressReporter(runtime.repository, job_id)
    job = runtime.repository.get(job_id)
    if not job or reporter.cancelled():
        return
    work_dir: Path | None = None
    try:
        source = Path(job.source_path or "")
        if not source.is_file():
            raise ApiError("UPLOAD_MISSING", "The uploaded file is no longer available.", status_code=410)
        work_dir = source.parent

        reporter.update(JobStatus.ANALYZING, "Checking your file", progress=2)
        # Don't trust the extension: the file must actually contain a readable audio stream.
        try:
            validate_media(source, require_video=False, require_audio=True, timeout_seconds=settings.provider_socket_timeout_seconds)
        except ApiError as exc:
            raise ApiError("UNREADABLE_FILE", "This file is damaged or isn't a supported audio/video file.", status_code=422) from exc
        duration = probe_duration_seconds(source, timeout_seconds=settings.provider_socket_timeout_seconds)
        args, output, filename, work_duration, message = _plan(job, source, duration, work_dir)
        reporter.update(JobStatus.ANALYZING, "Ready to process", progress=8, duration_seconds=duration, title=job.source_filename)
        reporter.ensure_active()

        reporter.update(JobStatus.MERGING, message, progress=10)

        def on_progress(fraction: float) -> None:
            reporter.update(JobStatus.MERGING, message, progress=round(10 + 85 * min(1.0, max(0.0, fraction)), 2))

        try:
            run_ffmpeg(
                args,
                duration_seconds=int(work_duration) if work_duration else None,
                timeout_seconds=settings.ffmpeg_timeout_seconds,
                on_progress=on_progress,
                cancelled=reporter.cancelled,
            )
        except ApiError as exc:
            if exc.code == "FFMPEG_FAILED":
                raise ApiError("PROCESSING_FAILED", "We couldn't process this file. It may be damaged.", status_code=422) from exc
            raise

        reporter.ensure_active()
        reporter.update(JobStatus.VALIDATING, "Checking the result", progress=97)
        validate_media(output, require_video=False, require_audio=True, timeout_seconds=settings.provider_socket_timeout_seconds)
        extension = output.suffix.lstrip(".")
        stored = runtime.storage.store_completed(job_id, output, filename, mime_type_for(extension))
        reporter.update(
            JobStatus.READY,
            "Your file is ready.",
            progress=100,
            downloaded_bytes=stored.size_bytes,
            total_bytes=stored.size_bytes,
            speed_bytes_per_second=None,
            eta_seconds=0,
            storage_key=stored.key,
            final_filename=stored.filename,
            final_size_bytes=stored.size_bytes,
            mime_type=stored.mime_type,
            container=extension,
        )
        shutil.rmtree(work_dir, ignore_errors=True)
    except DownloadCancelled:
        current = runtime.repository.get(job_id)
        if current and current.status not in {JobStatus.CANCELLED, JobStatus.EXPIRED}:
            reporter.update(JobStatus.CANCELLED, "Cancelled.", speed_bytes_per_second=None, eta_seconds=None)
        runtime.storage.delete_job(job_id)
    except ApiError as error:
        _mark_failed(reporter, error)
        logger.warning("audio_tool_failed", extra={"job_id": job_id, "error_code": error.code})
        if work_dir:
            shutil.rmtree(work_dir, ignore_errors=True)
    except Exception:
        _mark_failed(reporter, ApiError("PROCESSING_FAILED", "Something went wrong while processing this file.", status_code=502))
        logger.exception("unexpected_audio_tool_failure", extra={"job_id": job_id})
        if work_dir:
            shutil.rmtree(work_dir, ignore_errors=True)
    finally:
        if owns_runtime:
            runtime.redis.close()
