from __future__ import annotations

import base64
import hashlib
import hmac
import ipaddress
import json
import re
import secrets
import unicodedata
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlsplit

from app.core.errors import ApiError

_VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{6,20}$")
_ALLOWED_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"}


def normalize_youtube_url(value: str) -> tuple[str, str]:
    """Return a canonical watch URL and id without ever fetching user supplied URLs.

    yt-dlp is only handed the canonical youtube.com URL. This keeps arbitrary hosts,
    redirect chains, credentials, local IPs, and custom schemes out of the worker.
    """

    try:
        parsed = urlsplit(value.strip())
    except ValueError as exc:
        raise ApiError("INVALID_URL", "The video URL is invalid.") from exc
    if parsed.scheme not in {"http", "https"} or parsed.username or parsed.password:
        raise ApiError("INVALID_URL", "Use a public HTTP(S) YouTube video URL.")
    host = (parsed.hostname or "").lower().rstrip(".")
    if host not in _ALLOWED_HOSTS:
        raise ApiError("UNSUPPORTED_HOST", "Only public YouTube video URLs are supported.")
    try:
        if ipaddress.ip_address(host):
            raise ApiError("UNSUPPORTED_HOST", "IP address URLs are not supported.")
    except ValueError:
        pass

    video_id: str | None = None
    if host == "youtu.be":
        video_id = parsed.path.strip("/").split("/")[0] or None
    elif parsed.path.rstrip("/") == "/watch":
        video_id = parse_qs(parsed.query).get("v", [None])[0]
    else:
        pieces = [part for part in parsed.path.split("/") if part]
        if len(pieces) >= 2 and pieces[0] in {"shorts", "embed", "live"}:
            video_id = pieces[1]
    if not video_id or not _VIDEO_ID.fullmatch(video_id):
        raise ApiError("INVALID_URL", "The URL does not contain a valid YouTube video id.")
    return f"https://www.youtube.com/watch?v={video_id}", video_id


def sanitize_filename(title: str, extension: str, *, max_stem_length: int = 120) -> str:
    """Produce a portable, presentation-safe download name without path traversal."""

    safe_extension = extension.lower().lstrip(".")
    if safe_extension not in {"mp4", "webm", "m4a", "mp3"}:
        raise ValueError("Unsupported file extension")
    normalized = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r'[<>:"/\\|?*\x00-\x1f]', " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip(" .")
    normalized = normalized[:max_stem_length].rstrip(" .")
    if not normalized or normalized in {".", ".."}:
        normalized = "vidleaf-download"
    return f"{normalized}.{safe_extension}"


class DownloadTokenService:
    def __init__(self, secret: str, lifetime_seconds: int) -> None:
        if len(secret) < 24:
            raise RuntimeError("DOWNLOAD_TOKEN_SECRET must be at least 24 characters long.")
        self._secret = secret.encode("utf-8")
        self._lifetime_seconds = lifetime_seconds

    def issue(self, job_id: str, owner_id: str) -> tuple[str, datetime]:
        expires_at = datetime.now(UTC) + timedelta(seconds=self._lifetime_seconds)
        payload = {"jobId": job_id, "ownerId": owner_id, "exp": int(expires_at.timestamp())}
        encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
        signature = hmac.new(self._secret, encoded.encode(), hashlib.sha256).hexdigest()
        return f"{encoded}.{signature}", expires_at

    def verify(self, token: str, job_id: str, owner_id: str) -> bool:
        try:
            encoded, supplied_signature = token.rsplit(".", 1)
            expected_signature = hmac.new(self._secret, encoded.encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(supplied_signature, expected_signature):
                return False
            payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
            return (
                payload["jobId"] == job_id
                and payload["ownerId"] == owner_id
                and int(payload["exp"]) >= int(datetime.now(UTC).timestamp())
            )
        except (ValueError, KeyError, TypeError, json.JSONDecodeError):
            return False


def new_owner_id() -> str:
    return secrets.token_urlsafe(32)
