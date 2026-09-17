from __future__ import annotations

import mimetypes
import shutil
import time
from pathlib import Path

from app.storage.base import StoredFile


class LocalStorage:
    """Private filesystem storage. Its root must never be served by a web server."""

    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.work_root = self.root / "work"
        self.file_root = self.root / "files"
        self.work_root.mkdir(parents=True, exist_ok=True)
        self.file_root.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _safe_job_id(job_id: str) -> str:
        if not job_id.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Invalid job id")
        return job_id

    def working_directory(self, job_id: str) -> Path:
        path = self.work_root / self._safe_job_id(job_id)
        path.mkdir(parents=True, exist_ok=True)
        return path

    def store_completed(self, job_id: str, source: Path, filename: str, mime_type: str) -> StoredFile:
        target_dir = self.file_root / self._safe_job_id(job_id)
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / filename
        shutil.move(str(source), str(target))
        return StoredFile(
            key=str(target.relative_to(self.root)).replace("\\", "/"),
            filename=filename,
            size_bytes=target.stat().st_size,
            mime_type=mime_type or mimetypes.guess_type(filename)[0] or "application/octet-stream",
        )

    def local_path(self, key: str) -> Path | None:
        candidate = (self.root / key).resolve()
        if self.root not in candidate.parents or not candidate.is_file():
            return None
        return candidate

    def signed_url(self, key: str, filename: str, expires_seconds: int) -> str | None:
        return None

    def delete_job(self, job_id: str, storage_key: str | None = None) -> None:
        safe_id = self._safe_job_id(job_id)
        shutil.rmtree(self.work_root / safe_id, ignore_errors=True)
        shutil.rmtree(self.file_root / safe_id, ignore_errors=True)

    def cleanup_orphans(self, max_age_seconds: int) -> int:
        removed = 0
        cutoff = time.time() - max_age_seconds
        for parent in (self.work_root, self.file_root):
            for child in parent.iterdir():
                if child.is_dir() and child.stat().st_mtime < cutoff:
                    shutil.rmtree(child, ignore_errors=True)
                    removed += 1
        return removed
