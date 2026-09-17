from __future__ import annotations

from rq import Worker

from app.core.config import get_settings
from app.runtime import build_runtime


def main() -> None:
    settings = get_settings()
    runtime = build_runtime(settings)
    try:
        # One RQ process handles one media job at a time. Scale worker replicas deliberately;
        # do not let a single host launch unbounded FFmpeg processes.
        worker = Worker(["downloads"], connection=runtime.redis, name="vidleaf-download-worker")
        worker.work(with_scheduler=True)
    finally:
        runtime.redis.close()


if __name__ == "__main__":
    main()
