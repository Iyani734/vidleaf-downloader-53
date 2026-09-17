from __future__ import annotations

from fastapi.testclient import TestClient

from app.schemas import JobStatus


def _create(client: TestClient) -> str:
    response = client.post(
        "/api/v1/downloads",
        json={
            "url": "https://youtu.be/dQw4w9WgXcQ",
            "quality": "1080p",
            "container": "mp4",
            "allowQualityFallback": False,
        },
    )
    assert response.status_code == 202, response.text
    return response.json()["jobId"]


def test_job_creation_cancellation_and_owner_isolation(api_client) -> None:
    client, runtime, queue, app = api_client
    job_id = _create(client)
    current = client.get(f"/api/v1/downloads/{job_id}")
    assert current.status_code == 200
    assert current.json()["status"] == "queued"

    cancelled = client.delete(f"/api/v1/downloads/{job_id}")
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert queue.cancelled

    with TestClient(app) as second_client:
        hidden = second_client.get(f"/api/v1/downloads/{job_id}")
    assert hidden.status_code == 404
    assert hidden.json()["error"]["code"] == "JOB_NOT_FOUND"


def test_job_status_polling_does_not_trip_global_rate_limit(api_client) -> None:
    client, _, _, _ = api_client
    job_id = _create(client)
    response = None
    for _ in range(1005):
        response = client.get(f"/api/v1/downloads/{job_id}")
    assert response is not None
    assert response.status_code == 200
    assert response.json()["status"] == "queued"


def test_ready_file_needs_owner_bound_short_lived_token(api_client) -> None:
    client, runtime, _, app = api_client
    job_id = _create(client)
    job = runtime.repository.get(job_id)
    assert job
    work = runtime.storage.working_directory(job_id)
    media = work / "final.mp4"
    media.write_bytes(b"not-real-video-for-streaming-test")
    stored = runtime.storage.store_completed(job_id, media, "download.mp4", "video/mp4")
    job.status = JobStatus.READY
    job.storage_key = stored.key
    job.final_filename = stored.filename
    job.mime_type = stored.mime_type
    job.final_size_bytes = stored.size_bytes
    runtime.repository.publish(job, "ready")

    status = client.get(f"/api/v1/downloads/{job_id}")
    assert status.status_code == 200
    url = status.json()["downloadUrl"]
    delivered = client.get(url)
    assert delivered.status_code == 200
    assert delivered.content == b"not-real-video-for-streaming-test"
    assert "attachment" in delivered.headers["content-disposition"]

    with TestClient(app) as second_client:
        leaked_url = second_client.get(url)
    assert leaked_url.status_code == 404


def test_expired_file_returns_gone_even_with_a_valid_owner_token(api_client) -> None:
    client, runtime, _, app = api_client
    job_id = _create(client)
    job = runtime.repository.get(job_id)
    assert job
    job.status = JobStatus.EXPIRED
    job.storage_key = "files/nowhere/download.mp4"
    job.final_filename = "download.mp4"
    runtime.repository.publish(job, "expired")
    token, _ = app.state.tokens.issue(job_id, job.owner_id)
    response = client.get(f"/api/v1/downloads/{job_id}/file?token={token}")
    assert response.status_code == 410
    assert response.json()["error"]["code"] == "JOB_EXPIRED"
