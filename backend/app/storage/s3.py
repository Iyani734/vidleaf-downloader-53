from __future__ import annotations

import mimetypes
import shutil
from pathlib import Path

from app.storage.base import StoredFile


class S3Storage:
    """S3-compatible completed-file storage with private objects and signed delivery URLs."""

    def __init__(
        self,
        *,
        temporary_root: Path,
        bucket: str,
        endpoint_url: str | None,
        region: str,
        access_key_id: str | None,
        secret_access_key: str | None,
    ) -> None:
        import boto3

        self.temporary_root = temporary_root.resolve()
        self.temporary_root.mkdir(parents=True, exist_ok=True)
        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            region_name=region,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
        )

    def working_directory(self, job_id: str) -> Path:
        path = self.temporary_root / job_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def store_completed(self, job_id: str, source: Path, filename: str, mime_type: str) -> StoredFile:
        key = f"completed/{job_id}/{filename}"
        content_type = mime_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        self.client.upload_file(str(source), self.bucket, key, ExtraArgs={"ContentType": content_type})
        return StoredFile(key=key, filename=filename, size_bytes=source.stat().st_size, mime_type=content_type)

    def local_path(self, key: str) -> Path | None:
        return None

    def signed_url(self, key: str, filename: str, expires_seconds: int) -> str | None:
        return self.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket,
                "Key": key,
                "ResponseContentDisposition": f'attachment; filename="{filename}"',
            },
            ExpiresIn=expires_seconds,
        )

    def delete_job(self, job_id: str, storage_key: str | None = None) -> None:
        prefix = f"completed/{job_id}/"
        response = self.client.list_objects_v2(Bucket=self.bucket, Prefix=prefix)
        objects = [{"Key": item["Key"]} for item in response.get("Contents", [])]
        if objects:
            self.client.delete_objects(Bucket=self.bucket, Delete={"Objects": objects})
        shutil.rmtree(self.temporary_root / job_id, ignore_errors=True)

    def cleanup_orphans(self, max_age_seconds: int) -> int:
        # Job expiry drives normal S3 removal. A lifecycle rule should protect against crashes.
        return 0
