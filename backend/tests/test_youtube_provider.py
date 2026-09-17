from __future__ import annotations

import pytest

from app.core.errors import ApiError
from app.providers.youtube import YouTubeProvider


@pytest.fixture
def provider() -> YouTubeProvider:
    return YouTubeProvider(socket_timeout_seconds=1, maximum_duration_seconds=3600)


@pytest.fixture
def source_info() -> dict:
    return {
        "id": "dQw4w9WgXcQ",
        "title": "Authorized test video",
        "uploader": "VidLeaf tests",
        "thumbnail": "https://i.example/thumb.jpg",
        "duration": 120,
        "upload_date": "20260101",
        "formats": [
            {"format_id": "137", "ext": "mp4", "height": 1080, "width": 1920, "fps": 30, "vcodec": "avc1.640028", "acodec": "none", "filesize": 1000, "tbr": 100},
            {"format_id": "140", "ext": "m4a", "vcodec": "none", "acodec": "mp4a.40.2", "filesize": 200, "abr": 128},
            {"format_id": "18", "ext": "mp4", "height": 360, "width": 640, "fps": 30, "vcodec": "avc1.42001E", "acodec": "mp4a.40.2", "filesize": 300, "tbr": 50},
            {"format_id": "313", "ext": "webm", "height": 2160, "width": 3840, "fps": 30, "vcodec": "vp09.00.51.08", "acodec": "none", "filesize": 5000, "tbr": 500},
            {"format_id": "248", "ext": "webm", "height": 1080, "width": 1920, "fps": 60, "vcodec": "vp9", "acodec": "none", "filesize": 900, "tbr": 90},
            {"format_id": "251", "ext": "webm", "vcodec": "none", "acodec": "opus", "filesize": 150, "abr": 160},
        ],
    }


def test_analysis_exposes_only_real_qualities_and_deduplicates(provider, source_info) -> None:
    result = provider.analyze(source_info)
    ids = {item.id for item in result.formats}
    assert result.formats[0].id == "2160p-webm"
    assert result.formats[0].label == "4K / 2160p"
    assert result.formats[0].recommended is True
    assert all(item.quality != "best" for item in result.formats)
    assert "1080p-mp4" in ids
    assert "2160p-webm" in ids
    assert "1080p-webm" in ids
    assert "360p-mp4" in ids
    assert "audio-m4a" in ids and "audio-mp3" in ids
    assert "2160p-mp4" not in ids and "1440p-mp4" not in ids
    assert len(ids) == len(result.formats)
    mp4 = next(item for item in result.formats if item.id == "1080p-mp4")
    assert mp4.requires_merge is True
    assert mp4.estimated_size_bytes == 1200


def test_exact_quality_is_not_silently_substituted(provider, source_info) -> None:
    with pytest.raises(ApiError, match="not available"):
        provider.select(source_info, quality="2160p", container="mp4", audio_format=None)
    webm_4k = provider.select(source_info, quality="2160p", container="webm", audio_format=None)
    assert webm_4k.video_format_id == "313" and webm_4k.audio_format_id == "251"


def test_explicit_fallback_and_audio_selection(provider, source_info) -> None:
    fallback = provider.select(
        source_info,
        quality="2160p",
        container="mp4",
        audio_format=None,
        allow_quality_fallback=True,
    )
    assert fallback.public_format.quality == "1080p"
    assert fallback.video_format_id == "137" and fallback.audio_format_id == "140"
    best = provider.select(source_info, quality="best", container="mp4", audio_format=None)
    assert best.public_format.quality == "2160p"
    assert best.output_extension == "webm"
    mp3 = provider.select(source_info, quality="audio", container="mp4", audio_format="mp3")
    assert mp3.audio_transcode is True and mp3.output_extension == "mp3"
