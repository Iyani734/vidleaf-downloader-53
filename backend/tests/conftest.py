from __future__ import annotations

from types import SimpleNamespace

import fakeredis
import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.core.config import Settings
from app.providers.youtube import YouTubeProvider
from app.repositories import RedisJobRepository
from app.runtime import Runtime
from app.storage.local import LocalStorage


class FakeQueue:
    def __init__(self) -> None:
        self.queue = SimpleNamespace(count=0)
        self.cancelled: list[str] = []

    def enqueue(self, job_id: str) -> str:
        return f"rq_{job_id}"

    def cancel_queued(self, task_id: str | None) -> None:
        if task_id:
            self.cancelled.append(task_id)


@pytest.fixture
def api_client(tmp_path, monkeypatch):
    settings = Settings(
        redis_url="redis://unused/0",
        data_dir=tmp_path / "data",
        download_token_secret="test-secret-that-is-long-enough-for-hmac-validation",
        rate_limit_per_minute=1000,
    )
    redis = fakeredis.FakeRedis(decode_responses=True)
    repository = RedisJobRepository(redis, prefix="test", expiry_seconds=3600, expired_retention_seconds=60)
    queue = FakeQueue()
    runtime = Runtime(
        redis=redis,
        repository=repository,
        queue=queue,  # type: ignore[arg-type]
        provider=YouTubeProvider(socket_timeout_seconds=1, maximum_duration_seconds=3600),
        storage=LocalStorage(settings.data_dir),
    )
    monkeypatch.setattr(main_module, "build_runtime", lambda _: runtime)
    app = main_module.create_app(settings)
    with TestClient(app) as client:
        yield client, runtime, queue, app
