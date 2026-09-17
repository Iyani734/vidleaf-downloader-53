from __future__ import annotations

import os
import time
from datetime import timedelta

import pytest

from app.core.errors import ApiError
from app.media import validate_media
from app.models import JobRecord, utc_now
from app.progress import JobProgressReporter
from app.schemas import JobStatus
from app.storage.local import LocalStorage


class MemoryRepository:
    def __init__(self, job: JobRecord) -> None:
        self.job = job
        self.events: list[str] = []

    def get(self, job_id: str) -> JobRecord | None:
        return self.job if job_id == self.job.job_id else None

    def publish(self, record: JobRecord, event_type: str = "progress") -> None:
        self.job = record
        self.events.append(event_type)


def test_weighted_progress_uses_actual_stream_bytes() -> None:
    job = JobRecord.new(
        job_id="dl_progress",
        owner_id="owner",
        source_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        quality="1080p",
        container="mp4",
        audio_format=None,
        audio_bitrate_kbps=None,
        allow_quality_fallback=False,
        expiry_seconds=600,
    )
    repository = MemoryRepository(job)
    reporter = JobProgressReporter(repository, job.job_id)  # type: ignore[arg-type]
    reporter.stream_progress(
        status=JobStatus.DOWNLOADING_VIDEO,
        message="Downloading video stream",
        stage_start=5,
        stage_end=70,
        downloaded=50,
        total=100,
        speed=10,
        eta=5,
    )
    assert repository.job.progress == 37.5
    assert repository.job.downloaded_bytes == 50
    assert repository.job.status == JobStatus.DOWNLOADING_VIDEO


def test_local_storage_keeps_files_outside_work_directory_and_cleans_orphans(tmp_path) -> None:
    storage = LocalStorage(tmp_path / "private")
    work = storage.working_directory("dl_safe")
    source = work / "final.mp4"
    source.write_bytes(b"video")
    stored = storage.store_completed("dl_safe", source, "safe.mp4", "video/mp4")
    assert storage.local_path(stored.key).read_bytes() == b"video"  # type: ignore[union-attr]
    assert not source.exists()

    abandoned = storage.working_directory("dl_abandoned")
    old = time.time() - 100
    os.utime(abandoned, (old, old))
    assert storage.cleanup_orphans(10) >= 1


def test_ffprobe_validation_requires_expected_streams(tmp_path, monkeypatch) -> None:
    media = tmp_path / "media.mp4"
    media.write_bytes(b"placeholder")

    class Result:
        returncode = 0
        stdout = '{"streams": [{"codec_type": "video"}, {"codec_type": "audio"}]}'

    monkeypatch.setattr("app.media._ffprobe_executable", lambda: "ffprobe")
    monkeypatch.setattr("app.media.subprocess.run", lambda *args, **kwargs: Result())
    validate_media(media, require_video=True, require_audio=True, timeout_seconds=1)

    class AudioOnlyResult:
        returncode = 0
        stdout = '{"streams": [{"codec_type": "audio"}]}'

    monkeypatch.setattr("app.media.subprocess.run", lambda *args, **kwargs: AudioOnlyResult())
    with pytest.raises(ApiError, match="missing"):
        validate_media(media, require_video=True, require_audio=True, timeout_seconds=1)


def test_ffmpeg_fallback_validation_does_not_decode_entire_file(tmp_path, monkeypatch) -> None:
    media = tmp_path / "media.mp4"
    media.write_bytes(b"placeholder")

    class Result:
        returncode = 1
        stdout = ""
        stderr = """
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'media.mp4':
  Stream #0:0: Video: h264, yuv420p, 2560x1440
  Stream #0:1: Audio: aac, 44100 Hz, stereo
At least one output file must be specified
"""

    def fake_run(args, **kwargs):
        assert "-f" not in args
        assert "null" not in args
        return Result()

    monkeypatch.setattr("app.media._ffprobe_executable", lambda: None)
    monkeypatch.setattr("app.media._ffmpeg_executable", lambda: "ffmpeg")
    monkeypatch.setattr("app.media.subprocess.run", fake_run)

    validate_media(media, require_video=True, require_audio=True, timeout_seconds=1)
