from __future__ import annotations

import asyncio
import json
import logging
import secrets
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import AsyncIterator

import anyio
from fastapi import Depends, FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, StreamingResponse

from app.core.config import Settings, get_settings
from app.core.errors import ApiError
from app.core.logging import configure_json_logging
from app.core.security import DownloadTokenService, new_owner_id, normalize_youtube_url
from app.models import JobRecord
from app.runtime import Runtime, build_runtime
from app.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    CreateDownloadResponse,
    DownloadJobResponse,
    DownloadRequest,
    ErrorPayload,
    ErrorResponse,
    HealthResponse,
    JobListResponse,
    JobStatus,
    TERMINAL_JOB_STATUSES,
    VideoFormat,
)

logger = logging.getLogger("vidleaf.api")


def _error_response(error: ApiError, request: Request) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    return JSONResponse(
        status_code=error.status_code,
        content=ErrorResponse(
            error=ErrorPayload(
                code=error.code,
                message=error.message,
                details=error.details,
                request_id=request_id,
            )
        ).model_dump(mode="json", by_alias=True),
    )


def _require_job(runtime: Runtime, owner_id: str, job_id: str) -> JobRecord:
    job = runtime.repository.get(job_id)
    if not job:
        raise ApiError("JOB_NOT_FOUND", "Download job not found.", status_code=404)
    if not secrets.compare_digest(job.owner_id, owner_id):
        # Do not disclose whether a different owner has the id.
        raise ApiError("JOB_NOT_FOUND", "Download job not found.", status_code=404)
    return job


def _public_job(job: JobRecord, request: Request, tokens: DownloadTokenService, settings: Settings) -> DownloadJobResponse:
    response = job.response()
    if job.status == JobStatus.READY and job.storage_key and job.final_filename:
        token, expires_at = tokens.issue(job.job_id, job.owner_id)
        response.download_url = f"{settings.api_prefix}/downloads/{job.job_id}/file?token={token}"
        response.download_token_expires_at = expires_at
    return response


def _should_rate_limit(request: Request, settings: Settings) -> bool:
    path = request.url.path
    if not path.startswith(settings.api_prefix):
        return False
    # Long-running downloads are polled by the UI. Those cheap, owner-scoped GETs must
    # never turn a healthy download card into a fake "failed" state after minutes of work.
    if request.method == "GET" and (
        path == f"{settings.api_prefix}/downloads" or path.startswith(f"{settings.api_prefix}/downloads/")
    ):
        return False
    return True


def _format_rank(item: VideoFormat) -> tuple[float, ...]:
    return (
        1.0 if item.recommended else 0.0,
        float(item.height or 0),
        float(item.fps or 0),
        float(item.estimated_size_bytes or 0),
    )


def _validate_cached_selection(cached: AnalysisResponse, request: DownloadRequest) -> VideoFormat:
    if request.quality == "audio":
        desired = request.audio_format or "m4a"
        options = [
            item
            for item in cached.formats
            if item.quality == "audio" and (desired == "best" or item.container == desired)
        ]
    elif request.quality == "best":
        options = sorted(
            [item for item in cached.formats if item.has_video],
            key=_format_rank,
            reverse=True,
        )
    else:
        options = [
            item
            for item in cached.formats
            if item.quality == request.quality and item.container == (request.container or "mp4")
        ]
    if not options:
        available = sorted({item.quality for item in cached.formats if item.has_video and item.quality != "best"}, reverse=True)
        label = {"2160p": "4K", "1440p": "2K"}.get(request.quality, request.quality)
        raise ApiError(
            "QUALITY_NOT_AVAILABLE",
            f"{label} is not available for this video.",
            status_code=422,
            details={"availableQualities": available},
        )
    return options[0]


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        configure_json_logging(settings.log_level)
        runtime = build_runtime(settings)
        runtime.redis.ping()
        app.state.runtime = runtime
        app.state.tokens = DownloadTokenService(settings.download_token_secret, settings.download_token_seconds)
        yield
        runtime.redis.close()

    app = FastAPI(
        title="VidLeaf API",
        version="1.0.0",
        summary="Asynchronous downloads for public YouTube videos users are permitted to download.",
        description=(
            "VidLeaf is for publicly accessible videos that the user owns or has permission to download. "
            "It does not bypass DRM, authentication, age gates, private-video access, or geographic restrictions."
        ),
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type", "X-Request-ID"],
        expose_headers=["Content-Disposition", "Content-Length", "Accept-Ranges", "X-Request-ID"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or f"req_{secrets.token_urlsafe(12)}"
        request.state.request_id = request_id[:128]
        length = request.headers.get("content-length")
        if length and int(length) > settings.max_request_bytes:
            return _error_response(
                ApiError("REQUEST_TOO_LARGE", "Request body exceeds the allowed size.", status_code=413), request
            )
        owner_id = request.cookies.get(settings.session_cookie_name)
        is_new_session = not owner_id or len(owner_id) < 32
        request.state.owner_id = new_owner_id() if is_new_session else owner_id
        # Fixed one-minute Redis counter. It intentionally keys on direct peer address instead
        # of spoofable forwarding headers; configure trusted proxy handling at the edge.
        if _should_rate_limit(request, settings):
            runtime: Runtime | None = getattr(request.app.state, "runtime", None)
            if runtime:
                minute = int(datetime.now(UTC).timestamp() // 60)
                client = request.client.host if request.client else "unknown"
                key = f"{settings.redis_key_prefix}:rate:{client}:{minute}"
                try:
                    count = runtime.redis.incr(key)
                    if count == 1:
                        runtime.redis.expire(key, 70)
                    if count > settings.rate_limit_per_minute:
                        return _error_response(ApiError("RATE_LIMITED", "Too many requests. Please retry shortly.", status_code=429), request)
                except Exception:
                    logger.warning("Rate-limit Redis check failed", extra={"request_id": request_id})
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        runtime: Runtime | None = getattr(request.app.state, "runtime", None)
        if runtime and request.url.path.startswith(settings.api_prefix):
            try:
                runtime.redis.incr(f"{settings.redis_key_prefix}:metrics:http:{response.status_code}")
            except Exception:
                pass
        logger.info(
            "request_complete",
            extra={"request_id": request_id, "method": request.method, "path": request.url.path, "status": response.status_code},
        )
        if is_new_session:
            response.set_cookie(
                settings.session_cookie_name,
                request.state.owner_id,
                httponly=True,
                secure=settings.secure_cookies or settings.is_production,
                samesite="lax",
                max_age=settings.job_expiry_seconds + settings.expired_record_retention_seconds,
                path=settings.api_prefix,
            )
        return response

    @app.exception_handler(ApiError)
    async def api_error_handler(request: Request, error: ApiError) -> JSONResponse:
        return _error_response(error, request)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, error: RequestValidationError) -> JSONResponse:
        return _error_response(
            ApiError("INVALID_REQUEST", "The request body is invalid.", status_code=422, details={"fields": error.errors()}),
            request,
        )

    def runtime_for(request: Request) -> Runtime:
        return request.app.state.runtime

    def owner_for(request: Request) -> str:
        return request.state.owner_id

    @app.get("/health/live", response_model=HealthResponse, tags=["health"])
    async def live() -> HealthResponse:
        return HealthResponse(status="live")

    @app.get("/health/ready", response_model=HealthResponse, tags=["health"])
    async def ready(runtime: Runtime = Depends(runtime_for)) -> HealthResponse:
        try:
            runtime.redis.ping()
            runtime.queue.queue.count  # confirms RQ can access its Redis queue
        except Exception as exc:
            raise ApiError("NOT_READY", "Redis or the download queue is unavailable.", status_code=503) from exc
        return HealthResponse(status="ready")

    @app.get("/metrics", include_in_schema=False)
    async def metrics(runtime: Runtime = Depends(runtime_for)) -> StreamingResponse:
        # Keep this endpoint behind the reverse proxy's internal-network policy in production.
        lines = ["# TYPE vidleaf_http_requests_total counter"]
        pattern = f"{settings.redis_key_prefix}:metrics:http:*"
        for key in runtime.redis.scan_iter(match=pattern):
            status = str(key).rsplit(":", 1)[-1]
            lines.append(f'vidleaf_http_requests_total{{status="{status}"}} {runtime.redis.get(key) or 0}')
        return StreamingResponse(iter(["\n".join(lines) + "\n"]), media_type="text/plain; version=0.0.4")

    @app.post(
        f"{settings.api_prefix}/videos/analyze",
        response_model=AnalysisResponse,
        responses={422: {"model": ErrorResponse}},
        tags=["videos"],
    )
    async def analyze_video(payload: AnalysisRequest, runtime: Runtime = Depends(runtime_for)) -> AnalysisResponse:
        canonical_url, _ = normalize_youtube_url(payload.url)
        cached = runtime.repository.get_analysis(canonical_url)
        if cached:
            return AnalysisResponse.model_validate(cached)
        info = await anyio.to_thread.run_sync(runtime.provider.extract, canonical_url)
        response = await anyio.to_thread.run_sync(runtime.provider.analyze, info)
        runtime.repository.cache_analysis(
            canonical_url,
            response.model_dump(mode="json", by_alias=True),
            settings.analysis_cache_seconds,
        )
        return response

    @app.post(
        f"{settings.api_prefix}/downloads",
        response_model=CreateDownloadResponse,
        status_code=202,
        responses={422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
        tags=["downloads"],
    )
    async def create_download(
        payload: DownloadRequest,
        request: Request,
        runtime: Runtime = Depends(runtime_for),
        owner_id: str = Depends(owner_for),
    ) -> CreateDownloadResponse:
        canonical_url, _ = normalize_youtube_url(payload.url)
        estimated_size: int | None = None
        cached_format: VideoFormat | None = None
        cached = runtime.repository.get_analysis(canonical_url)
        if cached:
            cached_format = _validate_cached_selection(AnalysisResponse.model_validate(cached), payload)
            estimated_size = cached_format.estimated_size_bytes
        if payload.quality == "audio":
            output_container = cached_format.container if cached_format else (payload.audio_format or "m4a")
        elif payload.quality == "best" and cached_format:
            output_container = cached_format.container
        else:
            output_container = payload.container or "mp4"
        job = JobRecord.new(
            job_id=f"dl_{secrets.token_urlsafe(15)}",
            owner_id=owner_id,
            source_url=canonical_url,
            quality=payload.quality,
            container=output_container,
            audio_format=payload.audio_format,
            audio_bitrate_kbps=payload.audio_bitrate_kbps if payload.quality == "audio" else None,
            allow_quality_fallback=payload.allow_quality_fallback,
            expiry_seconds=settings.job_expiry_seconds,
        )
        job.total_bytes = estimated_size
        runtime.repository.create(job)
        try:
            job.task_id = runtime.queue.enqueue(job.job_id)
            runtime.repository.publish(job, "queued")
        except Exception as exc:
            job.status = JobStatus.FAILED
            job.error_code = "WORKER_UNAVAILABLE"
            job.error_message = "The download queue is unavailable. Please retry shortly."
            job.message = job.error_message
            runtime.repository.publish(job, "failed")
            raise ApiError("WORKER_UNAVAILABLE", job.error_message, status_code=503) from exc
        return CreateDownloadResponse(
            job_id=job.job_id,
            status=job.status,
            quality=job.quality,
            container=job.container,
            estimated_size_bytes=estimated_size,
            created_at=job.created_at,
        )

    @app.get(f"{settings.api_prefix}/downloads", response_model=JobListResponse, tags=["downloads"])
    async def list_downloads(
        request: Request,
        runtime: Runtime = Depends(runtime_for),
        owner_id: str = Depends(owner_for),
    ) -> JobListResponse:
        tokens: DownloadTokenService = request.app.state.tokens
        return JobListResponse(jobs=[_public_job(job, request, tokens, settings) for job in runtime.repository.list_owned(owner_id)])

    @app.get(f"{settings.api_prefix}/downloads/{{job_id}}", response_model=DownloadJobResponse, tags=["downloads"])
    async def get_download(
        job_id: str,
        request: Request,
        runtime: Runtime = Depends(runtime_for),
        owner_id: str = Depends(owner_for),
    ) -> DownloadJobResponse:
        return _public_job(_require_job(runtime, owner_id, job_id), request, request.app.state.tokens, settings)

    @app.delete(f"{settings.api_prefix}/downloads/{{job_id}}", response_model=DownloadJobResponse, tags=["downloads"])
    async def cancel_download(
        job_id: str,
        request: Request,
        runtime: Runtime = Depends(runtime_for),
        owner_id: str = Depends(owner_for),
    ) -> DownloadJobResponse:
        job = _require_job(runtime, owner_id, job_id)
        previous_status = job.status
        if previous_status not in TERMINAL_JOB_STATUSES:
            job.status = JobStatus.CANCELLED
            job.message = "Cancellation requested."
            job.speed_bytes_per_second = None
            job.eta_seconds = None
            runtime.repository.publish(job, "cancelled")
            runtime.queue.cancel_queued(job.task_id)
            if previous_status == JobStatus.QUEUED:
                runtime.storage.delete_job(job.job_id)
        return _public_job(job, request, request.app.state.tokens, settings)

    @app.post(f"{settings.api_prefix}/downloads/{{job_id}}/retry", response_model=CreateDownloadResponse, status_code=202, tags=["downloads"])
    async def retry_download(
        job_id: str,
        request: Request,
        runtime: Runtime = Depends(runtime_for),
        owner_id: str = Depends(owner_for),
    ) -> CreateDownloadResponse:
        previous = _require_job(runtime, owner_id, job_id)
        if previous.status not in {JobStatus.FAILED, JobStatus.CANCELLED}:
            raise ApiError("JOB_NOT_RETRYABLE", "Only failed or cancelled downloads can be retried.", status_code=409)
        job = JobRecord.new(
            job_id=f"dl_{secrets.token_urlsafe(15)}",
            owner_id=owner_id,
            source_url=previous.source_url,
            quality=previous.quality,
            container=previous.container,
            audio_format=previous.audio_format,
            audio_bitrate_kbps=previous.audio_bitrate_kbps,
            allow_quality_fallback=previous.allow_quality_fallback,
            expiry_seconds=settings.job_expiry_seconds,
        )
        job.total_bytes = previous.total_bytes
        runtime.repository.create(job)
        try:
            job.task_id = runtime.queue.enqueue(job.job_id)
            runtime.repository.publish(job, "queued")
        except Exception as exc:
            raise ApiError("WORKER_UNAVAILABLE", "The download queue is unavailable. Please retry shortly.", status_code=503) from exc
        return CreateDownloadResponse(
            job_id=job.job_id,
            status=job.status,
            quality=job.quality,
            container=job.container,
            estimated_size_bytes=job.total_bytes,
            created_at=job.created_at,
        )

    @app.get(f"{settings.api_prefix}/downloads/{{job_id}}/events", tags=["downloads"])
    async def download_events(
        job_id: str,
        request: Request,
        runtime: Runtime = Depends(runtime_for),
        owner_id: str = Depends(owner_for),
    ) -> StreamingResponse:
        _require_job(runtime, owner_id, job_id)

        async def stream() -> AsyncIterator[str]:
            pubsub = runtime.redis.pubsub(ignore_subscribe_messages=True)
            pubsub.subscribe(f"{settings.redis_key_prefix}:events:{job_id}")
            try:
                current = _require_job(runtime, owner_id, job_id)
                yield f"event: status\ndata: {json.dumps(current.response().model_dump(mode='json', by_alias=True))}\n\n"
                if current.status in TERMINAL_JOB_STATUSES:
                    return
                while not await request.is_disconnected():
                    message = await anyio.to_thread.run_sync(lambda: pubsub.get_message(timeout=10.0))
                    if message and message.get("type") == "message":
                        payload = str(message["data"])
                        yield f"event: progress\ndata: {payload}\n\n"
                        event = json.loads(payload)
                        if event.get("job", {}).get("status") in {item.value for item in TERMINAL_JOB_STATUSES}:
                            return
                    else:
                        yield ": keepalive\n\n"
            finally:
                pubsub.unsubscribe()
                pubsub.close()

        return StreamingResponse(
            stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
        )

    @app.get(f"{settings.api_prefix}/downloads/{{job_id}}/file", tags=["downloads"])
    async def download_file(
        job_id: str,
        request: Request,
        token: str = Query(min_length=20, max_length=2_048),
        runtime: Runtime = Depends(runtime_for),
        owner_id: str = Depends(owner_for),
    ):
        job = _require_job(runtime, owner_id, job_id)
        if not request.app.state.tokens.verify(token, job_id, owner_id):
            raise ApiError("INVALID_DOWNLOAD_TOKEN", "The download link is invalid or has expired.", status_code=403)
        if job.status == JobStatus.EXPIRED:
            raise ApiError("JOB_EXPIRED", "This download has expired.", status_code=410)
        if job.status != JobStatus.READY or not job.storage_key or not job.final_filename:
            raise ApiError("FILE_NOT_READY", "The file is not ready for download.", status_code=409)
        signed_url = runtime.storage.signed_url(job.storage_key, job.final_filename, settings.download_token_seconds)
        if signed_url:
            return RedirectResponse(signed_url, status_code=307)
        path = runtime.storage.local_path(job.storage_key)
        if not path:
            raise ApiError("FILE_UNAVAILABLE", "The completed file is no longer available.", status_code=410)
        # Starlette FileResponse provides streaming and single-range support without loading the file.
        return FileResponse(path, media_type=job.mime_type or "application/octet-stream", filename=job.final_filename)

    return app


app = create_app()
