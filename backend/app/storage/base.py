from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


@dataclass(frozen=True)
class StoredFile:
    key: str
    filename: str
    size_bytes: int
    mime_type: str


class Storage(Protocol):
    def working_directory(self, job_id: str) -> Path: ...

    def store_completed(self, job_id: str, source: Path, filename: str, mime_type: str) -> StoredFile: ...

    def local_path(self, key: str) -> Path | None: ...

    def signed_url(self, key: str, filename: str, expires_seconds: int) -> str | None: ...

    def delete_job(self, job_id: str, storage_key: str | None = None) -> None: ...

    def cleanup_orphans(self, max_age_seconds: int) -> int: ...
