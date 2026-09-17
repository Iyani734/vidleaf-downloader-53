from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

from app.core.errors import ApiError, DownloadCancelled, ProviderError
from app.schemas import AnalysisResponse, VideoFormat, VideoMetadata

ProgressCallback = Callable[[int, int | None, int | None, int | None], None]
CancellationCheck = Callable[[], bool]

_VIDEO_CODECS = {"mp4": ("avc", "h264", "hevc", "hvc", "av01"), "webm": ("vp8", "vp9", "vp09", "av01")}
_AUDIO_CODECS = {"mp4": ("mp4a", "aac", "alac"), "webm": ("opus", "vorbis")}
_QUALITY_LABELS = {2160: "4K / 2160p", 1440: "2K / 1440p", 1080: "Full HD / 1080p", 720: "HD / 720p"}


@dataclass(frozen=True)
class StreamSelection:
    public_format: VideoFormat
    video_format_id: str | None
    audio_format_id: str | None
    output_extension: str
    audio_transcode: bool = False


@dataclass(frozen=True)
class _Candidate:
    public: VideoFormat
    score: tuple[float, ...]
    video_format_id: str | None
    audio_format_id: str | None
    output_extension: str
    audio_transcode: bool = False


class YouTubeProvider:
    """yt-dlp adapter that exposes only server-selected, safe output profiles."""

    def __init__(
        self,
        *,
        socket_timeout_seconds: int,
        maximum_duration_seconds: int,
        player_clients: list[str] | None = None,
        cookies_file: Path | None = None,
        js_runtime: str | None = None,
        remote_components: list[str] | None = None,
    ) -> None:
        self.socket_timeout_seconds = socket_timeout_seconds
        self.maximum_duration_seconds = maximum_duration_seconds
        self.player_clients = player_clients or []
        self.cookies_file = cookies_file
        self.js_runtime = js_runtime
        self.remote_components = remote_components or []

    def _ydl_base_options(self) -> dict[str, Any]:
        options: dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "socket_timeout": self.socket_timeout_seconds,
        }
        if self.player_clients:
            options["extractor_args"] = {"youtube": {"player_client": self.player_clients}}
        if self.cookies_file:
            options["cookiefile"] = str(self.cookies_file)
        if self.js_runtime:
            runtime = self.js_runtime.strip()
            runtime_path = Path(runtime)
            if runtime_path.exists():
                options["js_runtimes"] = {"node": {"path": str(runtime_path)}}
            else:
                options["js_runtimes"] = {runtime.lower(): {}}
        if self.remote_components:
            options["remote_components"] = self.remote_components
        return options

    @staticmethod
    def _ydl_error(error: Exception) -> ProviderError:
        message = str(error).lower()
        if "private video" in message:
            return ProviderError("VIDEO_PRIVATE", "This video is private.", status_code=422)
        if "sign in" in message or "login" in message or "age-restricted" in message:
            return ProviderError("LOGIN_REQUIRED", "This video requires sign-in and cannot be downloaded.", status_code=422)
        if "not available" in message or "unavailable" in message or "removed" in message:
            return ProviderError("VIDEO_UNAVAILABLE", "This video is unavailable.", status_code=422)
        if "429" in message or "too many requests" in message:
            return ProviderError("PROVIDER_THROTTLED", "The video provider is temporarily throttling requests.", status_code=503)
        return ProviderError("PROVIDER_ERROR", "The video provider could not be reached reliably.", status_code=503)

    def extract(self, canonical_url: str) -> dict[str, Any]:
        try:
            from yt_dlp import YoutubeDL
            from yt_dlp.utils import DownloadError

            options = {
                **self._ydl_base_options(),
                "skip_download": True,
            }
            with YoutubeDL(options) as ydl:
                info = ydl.extract_info(canonical_url, download=False)
            if not isinstance(info, dict):
                raise ProviderError("VIDEO_UNAVAILABLE", "The video provider returned no media information.", status_code=422)
            if info.get("duration") and int(info["duration"]) > self.maximum_duration_seconds:
                raise ProviderError(
                    "DURATION_LIMIT_EXCEEDED",
                    "This video exceeds the configured maximum duration.",
                    status_code=422,
                    details={"maximumDurationSeconds": self.maximum_duration_seconds},
                )
            return info
        except ProviderError:
            raise
        except Exception as exc:
            # Avoid importing yt-dlp's exception at module load time so API health checks work
            # even before worker dependencies are present in a development environment.
            raise self._ydl_error(exc) from exc

    @staticmethod
    def _size(format_info: dict[str, Any], duration: int | None) -> tuple[int | None, bool]:
        exact = format_info.get("filesize")
        if isinstance(exact, (int, float)) and exact > 0:
            return int(exact), False
        approximate = format_info.get("filesize_approx")
        if isinstance(approximate, (int, float)) and approximate > 0:
            return int(approximate), True
        bitrate = format_info.get("tbr") or format_info.get("abr")
        if isinstance(bitrate, (int, float)) and duration and bitrate > 0:
            return math.ceil((bitrate * 1_000 / 8) * duration), True
        return None, True

    @staticmethod
    def _codec_matches(codec: str | None, allowed_prefixes: tuple[str, ...]) -> bool:
        return bool(codec and codec != "none" and codec.lower().startswith(allowed_prefixes))

    @classmethod
    def _video_compatible(cls, fmt: dict[str, Any], container: str) -> bool:
        return (
            fmt.get("vcodec") not in {None, "none"}
            and str(fmt.get("ext", "")).lower() == container
            and cls._codec_matches(str(fmt.get("vcodec")), _VIDEO_CODECS[container])
        )

    @classmethod
    def _audio_compatible(cls, fmt: dict[str, Any], container: str) -> bool:
        expected_ext = "m4a" if container == "mp4" else "webm"
        return (
            fmt.get("vcodec") in {None, "none"}
            and
            fmt.get("acodec") not in {None, "none"}
            and str(fmt.get("ext", "")).lower() in {expected_ext, container}
            and cls._codec_matches(str(fmt.get("acodec")), _AUDIO_CODECS[container])
        )

    @staticmethod
    def _score(fmt: dict[str, Any]) -> tuple[float, ...]:
        return (
            float(fmt.get("preference") or 0),
            float(fmt.get("quality") or 0),
            float(fmt.get("tbr") or 0),
            float(fmt.get("fps") or 0),
            float(fmt.get("filesize") or fmt.get("filesize_approx") or 0),
        )

    @staticmethod
    def _quality_label(height: int) -> str:
        return _QUALITY_LABELS.get(height, f"{height}p")

    @staticmethod
    def _video_rank(candidate: _Candidate) -> tuple[float, ...]:
        return (
            float(candidate.public.height or 0),
            float(candidate.public.fps or 0),
            *candidate.score,
        )

    @staticmethod
    def _metadata(info: dict[str, Any]) -> VideoMetadata:
        raw_date = str(info.get("upload_date") or "")
        upload_date: str | None = None
        if len(raw_date) == 8 and raw_date.isdigit():
            upload_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"
        elif raw_date:
            upload_date = raw_date
        live_status = str(info.get("live_status") or "").lower()
        return VideoMetadata(
            video_id=str(info.get("id") or ""),
            title=str(info.get("title") or "Untitled video"),
            channel=info.get("channel") or info.get("uploader"),
            thumbnail=info.get("thumbnail"),
            duration_seconds=int(info["duration"]) if info.get("duration") else None,
            upload_date=upload_date,
            is_live=bool(info.get("is_live")) or live_status in {"is_live", "is_upcoming", "post_live"},
            views=int(info["view_count"]) if info.get("view_count") else None,
        )

    def _catalog(self, info: dict[str, Any]) -> tuple[VideoMetadata, list[_Candidate]]:
        metadata = self._metadata(info)
        if metadata.is_live:
            raise ProviderError(
                "LIVESTREAM_UNSUPPORTED",
                "A livestream must finish before it can be downloaded.",
                status_code=422,
            )
        formats = [fmt for fmt in info.get("formats", []) if isinstance(fmt, dict) and fmt.get("format_id")]
        duration = metadata.duration_seconds
        candidates: list[_Candidate] = []

        for container in ("mp4", "webm"):
            audio_streams = [fmt for fmt in formats if self._audio_compatible(fmt, container)]
            for height in sorted({int(fmt["height"]) for fmt in formats if self._video_compatible(fmt, container) and fmt.get("height")}, reverse=True):
                video_streams = [fmt for fmt in formats if self._video_compatible(fmt, container) and int(fmt.get("height") or 0) == height]
                choices: list[_Candidate] = []
                for video in video_streams:
                    has_audio = video.get("acodec") not in {None, "none"}
                    audio = None if has_audio else (max(audio_streams, key=self._score) if audio_streams else None)
                    if not has_audio and audio is None:
                        continue
                    video_size, video_approx = self._size(video, duration)
                    audio_size, audio_approx = self._size(audio, duration) if audio else (0, False)
                    total = (video_size + audio_size) if video_size is not None and audio_size is not None else None
                    public = VideoFormat(
                        id=f"{height}p-{container}",
                        quality=f"{height}p",
                        label=self._quality_label(height),
                        width=int(video["width"]) if video.get("width") else None,
                        height=height,
                        fps=float(video["fps"]) if video.get("fps") else None,
                        container=container,
                        video_codec=video.get("vcodec"),
                        audio_codec=video.get("acodec") if has_audio else audio.get("acodec"),
                        has_video=True,
                        has_audio=True,
                        requires_merge=not has_audio,
                        estimated_size_bytes=total,
                        size_is_approximate=video_approx or audio_approx,
                    )
                    choices.append(
                        _Candidate(
                            public=public,
                            score=self._score(video) + self._score(audio or {}),
                            video_format_id=str(video["format_id"]),
                            audio_format_id=None if has_audio else str(audio["format_id"]),
                            output_extension=container,
                        )
                    )
                if choices:
                    candidates.append(max(choices, key=lambda item: item.score))

        # Audio M4A is only exposed when the source has a genuinely compatible M4A stream.
        m4a_streams = [fmt for fmt in formats if self._audio_compatible(fmt, "mp4")]
        if m4a_streams:
            audio = max(m4a_streams, key=self._score)
            size, approx = self._size(audio, duration)
            candidates.append(
                _Candidate(
                    public=VideoFormat(
                        id="audio-m4a",
                        quality="audio",
                        label="Audio only (M4A)",
                        container="m4a",
                        audio_codec=audio.get("acodec"),
                        has_video=False,
                        has_audio=True,
                        estimated_size_bytes=size,
                        size_is_approximate=approx,
                    ),
                    score=self._score(audio),
                    video_format_id=None,
                    audio_format_id=str(audio["format_id"]),
                    output_extension="m4a",
                )
            )
        # MP3 requires local FFmpeg conversion, but its source stream is real and is selected here.
        all_audio_streams = [fmt for fmt in formats if fmt.get("acodec") not in {None, "none"} and fmt.get("vcodec") in {None, "none"}]
        if all_audio_streams:
            audio = max(all_audio_streams, key=self._score)
            size, approx = self._size(audio, duration)
            candidates.append(
                _Candidate(
                    public=VideoFormat(
                        id="audio-mp3",
                        quality="audio",
                        label="Audio only (MP3)",
                        container="mp3",
                        audio_codec="mp3",
                        has_video=False,
                        has_audio=True,
                        requires_processing=True,
                        estimated_size_bytes=size,
                        size_is_approximate=True if size else approx,
                    ),
                    score=self._score(audio),
                    video_format_id=None,
                    audio_format_id=str(audio["format_id"]),
                    output_extension="mp3",
                    audio_transcode=True,
                )
            )
        return metadata, candidates

    def analyze(self, info: dict[str, Any]) -> AnalysisResponse:
        metadata, candidates = self._catalog(info)
        video_candidates = [candidate for candidate in candidates if candidate.public.has_video]
        audio_candidates = [candidate for candidate in candidates if not candidate.public.has_video]
        best = max(video_candidates, key=self._video_rank) if video_candidates else None
        video_formats = [
            candidate.public.model_copy(update={"recommended": candidate is best})
            for candidate in sorted(video_candidates, key=self._video_rank, reverse=True)
        ]
        audio_formats = [candidate.public for candidate in audio_candidates]
        public_formats = video_formats + audio_formats
        if video_candidates:
            public_formats[0].recommended = True
        return AnalysisResponse(**metadata.model_dump(), formats=public_formats)

    def select(
        self,
        info: dict[str, Any],
        *,
        quality: str,
        container: str,
        audio_format: str | None,
        allow_quality_fallback: bool = False,
    ) -> StreamSelection:
        _, candidates = self._catalog(info)
        if quality == "audio":
            desired = audio_format or "m4a"
            if desired == "best":
                audio_candidates = [item for item in candidates if not item.public.has_video]
                if not audio_candidates:
                    raise self._quality_error(candidates, quality)
                candidate = max(audio_candidates, key=lambda item: item.score)
            else:
                candidate = next((item for item in candidates if item.public.id == f"audio-{desired}"), None)
        elif quality == "best":
            video_candidates = [item for item in candidates if item.public.has_video]
            candidate = max(video_candidates, key=self._video_rank) if video_candidates else None
        else:
            candidate = next(
                (
                    item
                    for item in candidates
                    if item.public.quality == quality and item.public.container == container and item.public.has_video
                ),
                None,
            )
        if not candidate and allow_quality_fallback and quality.endswith("p"):
            requested_height = int(quality[:-1])
            eligible = [
                item
                for item in candidates
                if item.public.has_video
                and item.public.container == container
                and item.public.height
                and item.public.height <= requested_height
            ]
            if eligible:
                candidate = max(eligible, key=lambda item: ((item.public.height or 0), item.score))
        if not candidate:
            raise self._quality_error(candidates, quality)
        return StreamSelection(
            public_format=candidate.public,
            video_format_id=candidate.video_format_id,
            audio_format_id=candidate.audio_format_id,
            output_extension=candidate.output_extension,
            audio_transcode=candidate.audio_transcode,
        )

    @staticmethod
    def _quality_error(candidates: list[_Candidate], requested: str) -> ApiError:
        available = sorted({item.public.quality for item in candidates if item.public.has_video}, key=lambda value: int(value[:-1]) if value.endswith("p") else 99_999, reverse=True)
        label = {"2160p": "4K", "1440p": "2K"}.get(requested, requested)
        return ApiError(
            "QUALITY_NOT_AVAILABLE",
            f"{label} is not available for this video.",
            status_code=422,
            details={"availableQualities": available},
        )

    def download_format(
        self,
        canonical_url: str,
        format_id: str,
        directory: Path,
        stem: str,
        *,
        on_progress: ProgressCallback,
        cancelled: CancellationCheck,
    ) -> Path:
        """Download one known format id. No client-controlled yt-dlp arguments are accepted."""

        try:
            from yt_dlp import YoutubeDL

            directory.mkdir(parents=True, exist_ok=True)

            def hook(data: dict[str, Any]) -> None:
                if cancelled():
                    raise DownloadCancelled()
                if data.get("status") == "downloading":
                    total = data.get("total_bytes") or data.get("total_bytes_estimate")
                    on_progress(
                        int(data.get("downloaded_bytes") or 0),
                        int(total) if total else None,
                        int(data.get("speed")) if data.get("speed") else None,
                        int(data.get("eta")) if data.get("eta") else None,
                    )
                elif data.get("status") == "finished":
                    total = data.get("total_bytes") or data.get("downloaded_bytes")
                    on_progress(int(data.get("downloaded_bytes") or total or 0), int(total) if total else None, None, 0)

            options = {
                **self._ydl_base_options(),
                "format": format_id,
                "outtmpl": str(directory / f"{stem}.%(ext)s"),
                "continuedl": True,
                "nopart": False,
                "retries": 3,
                "fragment_retries": 3,
                "progress_hooks": [hook],
                "postprocessors": [],
            }
            with YoutubeDL(options) as ydl:
                ydl.download([canonical_url])
            files = sorted(
                (path for path in directory.glob(f"{stem}.*") if not path.name.endswith(".part")),
                key=lambda path: path.stat().st_mtime,
                reverse=True,
            )
            if not files:
                raise ProviderError("DOWNLOAD_FAILED", "The provider did not produce a media file.", status_code=502)
            return files[0]
        except DownloadCancelled:
            raise
        except ApiError:
            raise
        except Exception as exc:
            raise self._ydl_error(exc) from exc
