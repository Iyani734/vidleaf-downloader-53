from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from redis import Redis

from app.models import JobRecord, utc_now


class RedisJobRepository:
    """Redis-backed TTL job state, owner indexes, cache, and progress pub/sub."""

    def __init__(self, redis: Redis, *, prefix: str, expiry_seconds: int, expired_retention_seconds: int) -> None:
        self.redis = redis
        self.prefix = prefix
        self.expiry_seconds = expiry_seconds
        self.expired_retention_seconds = expired_retention_seconds

    def _key(self, kind: str, value: str) -> str:
        return f"{self.prefix}:{kind}:{value}"

    def _job_key(self, job_id: str) -> str:
        return self._key("job", job_id)

    def _owner_key(self, owner_id: str) -> str:
        return self._key("owner-jobs", owner_id)

    def _channel(self, job_id: str) -> str:
        return self._key("events", job_id)

    @staticmethod
    def _ttl(record: JobRecord, fallback: int) -> int:
        return max(1, int((record.expires_at - utc_now()).total_seconds()) + fallback)

    def create(self, record: JobRecord) -> None:
        self.save(record)
        self.redis.sadd(self._owner_key(record.owner_id), record.job_id)
        self.redis.expire(self._owner_key(record.owner_id), self.expiry_seconds + self.expired_retention_seconds)
        self.redis.zadd(self._key("expiry", "all"), {record.job_id: record.expires_at.timestamp()})

    def save(self, record: JobRecord, *, terminal_retention: bool = False) -> None:
        record.updated_at = utc_now()
        ttl = self._ttl(record, self.expired_retention_seconds if terminal_retention else 0)
        self.redis.setex(self._job_key(record.job_id), ttl, record.model_dump_json(by_alias=True))

    def get(self, job_id: str) -> JobRecord | None:
        raw = self.redis.get(self._job_key(job_id))
        return JobRecord.model_validate_json(raw) if raw else None

    def publish(self, record: JobRecord, event_type: str = "progress") -> None:
        self.save(record, terminal_retention=record.status.value in {"failed", "cancelled", "expired"})
        payload = json.dumps({"type": event_type, "job": record.response().model_dump(mode="json", by_alias=True)})
        self.redis.publish(self._channel(record.job_id), payload)

    def cache_analysis(self, canonical_url: str, value: dict[str, Any], seconds: int) -> None:
        self.redis.setex(self._key("analysis", canonical_url), seconds, json.dumps(value))

    def get_analysis(self, canonical_url: str) -> dict[str, Any] | None:
        raw = self.redis.get(self._key("analysis", canonical_url))
        return json.loads(raw) if raw else None

    def list_owned(self, owner_id: str) -> list[JobRecord]:
        ids = self.redis.smembers(self._owner_key(owner_id))
        records = [self.get(job_id) for job_id in ids]
        return sorted((item for item in records if item), key=lambda item: item.created_at, reverse=True)

    def active_count(self) -> int:
        return sum(
            1
            for job_id in self.redis.zrange(self._key("expiry", "all"), 0, -1)
            if (record := self.get(job_id)) and record.status.value in {"queued", "analyzing", "downloading_video", "downloading_audio", "merging", "validating"}
        )

    def expired_job_ids(self, now: datetime | None = None) -> list[str]:
        instant = (now or datetime.now(UTC)).timestamp()
        return list(self.redis.zrangebyscore(self._key("expiry", "all"), "-inf", instant))

    def remove_expiry_index(self, job_id: str) -> None:
        self.redis.zrem(self._key("expiry", "all"), job_id)

    def close(self) -> None:
        self.redis.close()
