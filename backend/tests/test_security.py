from __future__ import annotations

import pytest

from app.core.errors import ApiError
from app.core.security import DownloadTokenService, normalize_youtube_url, sanitize_filename


@pytest.mark.parametrize(
    ("value", "expected_id"),
    [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ?t=1", "dQw4w9WgXcQ"),
        ("https://m.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
    ],
)
def test_normalizes_only_youtube_urls(value: str, expected_id: str) -> None:
    normalized, video_id = normalize_youtube_url(value)
    assert normalized == f"https://www.youtube.com/watch?v={expected_id}"
    assert video_id == expected_id


@pytest.mark.parametrize(
    "value",
    [
        "file:///etc/passwd",
        "https://127.0.0.1/watch?v=dQw4w9WgXcQ",
        "https://evil.example/redirect?to=youtube.com",
        "https://user:password@youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtube.com/watch?v=bad",
    ],
)
def test_rejects_ssrf_and_unsupported_urls(value: str) -> None:
    with pytest.raises(ApiError):
        normalize_youtube_url(value)


def test_filename_sanitization_prevents_paths_and_windows_special_characters() -> None:
    name = sanitize_filename("../A <bad>: title? \\ file*", "mp4")
    assert name == "A bad title file.mp4"
    assert "/" not in name and "\\" not in name and ".." not in name


def test_download_token_is_short_lived_owner_bound_and_tamper_evident() -> None:
    service = DownloadTokenService("test-secret-that-is-long-enough-for-hmac-validation", 60)
    token, _ = service.issue("dl_abc", "owner-one")
    assert service.verify(token, "dl_abc", "owner-one")
    assert not service.verify(token, "dl_abc", "owner-two")
    assert not service.verify(f"{token}x", "dl_abc", "owner-one")
