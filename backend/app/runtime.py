from __future__ import annotations

from dataclasses import dataclass

from redis import Redis

from app.core.config import Settings
from app.local_redis import InMemoryRedis
from app.providers.youtube import YouTubeProvider
from app.queueing import DownloadQueue, ThreadedDownloadQueue
from app.repositories import RedisJobRepository
from app.storage import LocalStorage, S3Storage, Storage


@dataclass
class Runtime:
    redis: Redis | InMemoryRedis
    repository: RedisJobRepository
    queue: DownloadQueue | ThreadedDownloadQueue
    provider: YouTubeProvider
    storage: Storage


def build_storage(settings: Settings) -> Storage:
    if settings.storage_backend == "local":
        return LocalStorage(settings.data_dir)
    if settings.storage_backend == "s3":
        if not settings.s3_bucket:
            raise RuntimeError("S3_BUCKET is required when STORAGE_BACKEND=s3")
        return S3Storage(
            temporary_root=settings.data_dir / "work",
            bucket=settings.s3_bucket,
            endpoint_url=settings.s3_endpoint_url,
            region=settings.s3_region,
            access_key_id=settings.s3_access_key_id,
            secret_access_key=settings.s3_secret_access_key,
        )
    raise RuntimeError("STORAGE_BACKEND must be local or s3")


def build_runtime(settings: Settings) -> Runtime:
    if settings.queue_backend.lower() == "local":
        connection = InMemoryRedis()
        repository = RedisJobRepository(
            connection,  # type: ignore[arg-type]
            prefix=settings.redis_key_prefix,
            expiry_seconds=settings.job_expiry_seconds,
            expired_retention_seconds=settings.expired_record_retention_seconds,
        )
        runtime = Runtime(
            redis=connection,
            repository=repository,
            queue=None,  # type: ignore[arg-type]
            provider=YouTubeProvider(
                socket_timeout_seconds=settings.provider_socket_timeout_seconds,
                maximum_duration_seconds=settings.maximum_duration_seconds,
                player_clients=settings.youtube_player_clients,
                cookies_file=settings.youtube_cookies_file,
                js_runtime=settings.youtube_js_runtime,
                remote_components=settings.youtube_remote_components,
            ),
            storage=build_storage(settings),
        )
        runtime.queue = ThreadedDownloadQueue(runtime, settings)
        return runtime

    connection = Redis.from_url(settings.redis_url, decode_responses=True, health_check_interval=30)
    repository = RedisJobRepository(
        connection,
        prefix=settings.redis_key_prefix,
        expiry_seconds=settings.job_expiry_seconds,
        expired_retention_seconds=settings.expired_record_retention_seconds,
    )
    return Runtime(
        redis=connection,
        repository=repository,
        queue=DownloadQueue(connection, settings),
        provider=YouTubeProvider(
            socket_timeout_seconds=settings.provider_socket_timeout_seconds,
            maximum_duration_seconds=settings.maximum_duration_seconds,
            player_clients=settings.youtube_player_clients,
            cookies_file=settings.youtube_cookies_file,
            js_runtime=settings.youtube_js_runtime,
            remote_components=settings.youtube_remote_components,
        ),
        storage=build_storage(settings),
    )
