from __future__ import annotations

import json
import os
import queue
import shutil
import subprocess
import threading
import time
from pathlib import Path
from typing import Callable

from app.core.errors import ApiError, DownloadCancelled


def mime_type_for(extension: str) -> str:
    return {
        "mp4": "video/mp4",
        "webm": "video/webm",
        "m4a": "audio/mp4",
        "mp3": "audio/mpeg",
    }[extension]


def _ffmpeg_executable() -> str:
    configured = os.environ.get("FFMPEG_PATH")
    if configured:
        return configured
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as exc:
        raise ApiError("FFMPEG_UNAVAILABLE", "FFmpeg is not installed on this worker.", status_code=503) from exc


def _ffprobe_executable() -> str | None:
    configured = os.environ.get("FFPROBE_PATH")
    if configured:
        return configured
    return shutil.which("ffprobe")


def run_ffmpeg(
    arguments: list[str],
    *,
    duration_seconds: int | None,
    timeout_seconds: int,
    on_progress: Callable[[float], None],
    cancelled: Callable[[], bool],
) -> None:
    """Run server-composed FFmpeg arguments and forward true encoder progress."""

    command = [_ffmpeg_executable(), "-hide_banner", "-loglevel", "error", "-y", "-progress", "pipe:1", "-nostats", *arguments]
    try:
        process = subprocess.Popen(
            command,
            shell=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
        )
    except FileNotFoundError as exc:
        raise ApiError("FFMPEG_UNAVAILABLE", "FFmpeg is not installed on this worker.", status_code=503) from exc
    try:
        assert process.stdout is not None
        lines: queue.Queue[str | None] = queue.Queue()

        def read_progress() -> None:
            assert process.stdout is not None
            for line in iter(process.stdout.readline, ""):
                lines.put(line)
            lines.put(None)

        threading.Thread(target=read_progress, daemon=True).start()
        deadline = time.monotonic() + timeout_seconds
        while True:
            if cancelled():
                process.terminate()
                raise DownloadCancelled()
            if time.monotonic() > deadline:
                process.kill()
                raise ApiError("FFMPEG_TIMEOUT", "Media processing timed out.", status_code=504)
            try:
                line = lines.get(timeout=0.5)
            except queue.Empty:
                continue
            if line is None:
                break
            key, _, raw_value = line.strip().partition("=")
            if key == "out_time_ms" and duration_seconds and duration_seconds > 0:
                on_progress(min(1.0, int(raw_value or 0) / (duration_seconds * 1_000_000)))
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired as exc:
            process.kill()
            raise ApiError("FFMPEG_TIMEOUT", "Media processing timed out.", status_code=504) from exc
        if process.returncode != 0:
            raise ApiError("FFMPEG_FAILED", "FFmpeg could not process the downloaded streams.", status_code=502)
        on_progress(1.0)
    finally:
        if process.poll() is None:
            process.kill()


def validate_media(path: Path, *, require_video: bool, require_audio: bool, timeout_seconds: int) -> None:
    ffprobe = _ffprobe_executable()
    if not ffprobe:
        return _validate_media_with_ffmpeg(path, require_video=require_video, require_audio=require_audio, timeout_seconds=timeout_seconds)
    try:
        result = subprocess.run(
            [ffprobe, "-v", "error", "-show_streams", "-of", "json", str(path)],
            shell=False,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
    except FileNotFoundError as exc:
        raise ApiError("FFPROBE_UNAVAILABLE", "FFprobe is not installed on this worker.", status_code=503) from exc
    except subprocess.TimeoutExpired as exc:
        raise ApiError("VALIDATION_TIMEOUT", "Final-file validation timed out.", status_code=504) from exc
    if result.returncode != 0:
        raise ApiError("FINAL_FILE_INVALID", "The final media file could not be validated.", status_code=502)
    try:
        streams = json.loads(result.stdout).get("streams", [])
    except json.JSONDecodeError as exc:
        raise ApiError("FINAL_FILE_INVALID", "FFprobe returned invalid media metadata.", status_code=502) from exc
    codec_types = {stream.get("codec_type") for stream in streams}
    if (require_video and "video" not in codec_types) or (require_audio and "audio" not in codec_types):
        raise ApiError("FINAL_FILE_INVALID", "The final file is missing a required media stream.", status_code=502)


def _validate_media_with_ffmpeg(path: Path, *, require_video: bool, require_audio: bool, timeout_seconds: int) -> None:
    # When ffprobe is unavailable, do not decode the whole completed file with
    # ``ffmpeg -f null``. Large 2K/4K downloads can be perfectly valid but still
    # take longer than the API socket timeout to scan end-to-end. Asking ffmpeg
    # for input metadata is fast and still confirms the required streams exist.
    try:
        result = subprocess.run(
            [_ffmpeg_executable(), "-hide_banner", "-i", str(path)],
            shell=False,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ApiError("VALIDATION_TIMEOUT", "Final-file validation timed out.", status_code=504) from exc
    stdout = getattr(result, "stdout", "") or ""
    stderr = getattr(result, "stderr", "") or ""
    stream_output = f"{stdout}\n{stderr}"
    has_video = "Video:" in stream_output
    has_audio = "Audio:" in stream_output
    if (require_video and not has_video) or (require_audio and not has_audio):
        raise ApiError("FINAL_FILE_INVALID", "The final file is missing a required media stream.", status_code=502)
