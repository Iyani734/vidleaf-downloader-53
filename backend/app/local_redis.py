from __future__ import annotations

import fnmatch
import queue
import threading
import time
from collections.abc import Iterator
from typing import Any


class InMemoryPubSub:
    def __init__(self, redis: InMemoryRedis) -> None:
        self.redis = redis
        self.messages: queue.Queue[dict[str, Any]] = queue.Queue()
        self.channels: set[str] = set()

    def subscribe(self, *channels: str) -> None:
        with self.redis.lock:
            for channel in channels:
                if channel in self.channels:
                    continue
                self.channels.add(channel)
                self.redis.subscribers.setdefault(channel, []).append(self.messages)

    def get_message(self, timeout: float = 0.0) -> dict[str, Any] | None:
        try:
            return self.messages.get(timeout=timeout)
        except queue.Empty:
            return None

    def unsubscribe(self) -> None:
        with self.redis.lock:
            for channel in self.channels:
                queues = self.redis.subscribers.get(channel, [])
                self.redis.subscribers[channel] = [item for item in queues if item is not self.messages]
            self.channels.clear()

    def close(self) -> None:
        self.unsubscribe()


class InMemoryRedis:
    """Small Redis subset used by the local, single-process development backend."""

    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.strings: dict[str, str] = {}
        self.sets: dict[str, set[str]] = {}
        self.zsets: dict[str, dict[str, float]] = {}
        self.expiry: dict[str, float] = {}
        self.subscribers: dict[str, list[queue.Queue[dict[str, Any]]]] = {}

    def _purge_if_expired(self, key: str) -> None:
        deadline = self.expiry.get(key)
        if deadline is None or deadline > time.time():
            return
        self.strings.pop(key, None)
        self.sets.pop(key, None)
        self.zsets.pop(key, None)
        self.expiry.pop(key, None)

    def _touch_expiry(self, key: str, seconds: int) -> None:
        self.expiry[key] = time.time() + max(1, int(seconds))

    def ping(self) -> bool:
        return True

    def close(self) -> None:
        return None

    def get(self, key: str) -> str | None:
        with self.lock:
            self._purge_if_expired(key)
            return self.strings.get(key)

    def setex(self, key: str, seconds: int, value: str) -> bool:
        with self.lock:
            self.strings[key] = value
            self._touch_expiry(key, seconds)
            return True

    def incr(self, key: str) -> int:
        with self.lock:
            self._purge_if_expired(key)
            value = int(self.strings.get(key) or "0") + 1
            self.strings[key] = str(value)
            return value

    def expire(self, key: str, seconds: int) -> bool:
        with self.lock:
            exists = key in self.strings or key in self.sets or key in self.zsets
            if exists:
                self._touch_expiry(key, seconds)
            return exists

    def sadd(self, key: str, *members: str) -> int:
        with self.lock:
            self._purge_if_expired(key)
            target = self.sets.setdefault(key, set())
            before = len(target)
            target.update(members)
            return len(target) - before

    def smembers(self, key: str) -> set[str]:
        with self.lock:
            self._purge_if_expired(key)
            return set(self.sets.get(key, set()))

    def zadd(self, key: str, mapping: dict[str, float]) -> int:
        with self.lock:
            self._purge_if_expired(key)
            target = self.zsets.setdefault(key, {})
            created = 0
            for member, score in mapping.items():
                if member not in target:
                    created += 1
                target[member] = float(score)
            return created

    def zrange(self, key: str, start: int, end: int) -> list[str]:
        with self.lock:
            self._purge_if_expired(key)
            ordered = [member for member, _ in sorted(self.zsets.get(key, {}).items(), key=lambda item: item[1])]
            stop = None if end == -1 else end + 1
            return ordered[start:stop]

    def zrangebyscore(self, key: str, minimum: str | float, maximum: str | float) -> list[str]:
        with self.lock:
            self._purge_if_expired(key)
            low = float("-inf") if minimum == "-inf" else float(minimum)
            high = float("inf") if maximum == "+inf" else float(maximum)
            return [
                member
                for member, score in sorted(self.zsets.get(key, {}).items(), key=lambda item: item[1])
                if low <= score <= high
            ]

    def zrem(self, key: str, member: str) -> int:
        with self.lock:
            self._purge_if_expired(key)
            existed = member in self.zsets.get(key, {})
            self.zsets.get(key, {}).pop(member, None)
            return 1 if existed else 0

    def scan_iter(self, match: str) -> Iterator[str]:
        with self.lock:
            keys = set(self.strings) | set(self.sets) | set(self.zsets)
            for key in list(keys):
                self._purge_if_expired(key)
            keys = set(self.strings) | set(self.sets) | set(self.zsets)
            matches = [key for key in keys if fnmatch.fnmatch(key, match)]
        yield from matches

    def publish(self, channel: str, payload: str) -> int:
        with self.lock:
            queues = list(self.subscribers.get(channel, []))
        message = {"type": "message", "data": payload}
        for subscriber in queues:
            subscriber.put(message)
        return len(queues)

    def pubsub(self, ignore_subscribe_messages: bool = True) -> InMemoryPubSub:
        return InMemoryPubSub(self)
