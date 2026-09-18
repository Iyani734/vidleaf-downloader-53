from __future__ import annotations

import io
import shutil
import subprocess
from pathlib import Path

import pytest

from app.audio_enhancements import build_filter_chain, validate_selection
from app.audio_tasks import run_audio_clean_job
from app.core.config import Settings
from app.core.errors import ApiError
from app.schemas import JobStatus


def test_catalog_endpoint(api_client):
    client, *_ = api_client
    payload = client.get("/api/v1/audio/enhancements").json()
    ids = [item["id"] for item in payload["enhancements"]]
    assert "removeNoise" not in ids and "remove_noise" in ids
    assert payload["outputFormats"] == ["mp3", "m4a", "wav"]


def test_filter_chain_is_ordered_and_gentle_with_keep_music():
    strong = build_filter_chain(["remove_noise", "normalize"])
    gentle = build_filter_chain(["remove_noise", "normalize", "keep_music"])
    assert strong.index("afftdn") < strong.index("loudnorm")
    assert "nr=20" in strong and "nr=10" in gentle


def test_selection_requires_a_processing_option():
    with pytest.raises(ApiError):
        validate_selection(["keep_music"])
    with pytest.raises(ApiError):
        validate_selection(["not_a_thing"])


def test_create_audio_job_stores_upload_and_queues(api_client):
    client, runtime, queue, _ = api_client
    response = client.post(
        "/api/v1/audio/jobs",
        files={"file": ("podcast.mp3", io.BytesIO(b"fake-audio-bytes"), "audio/mpeg")},
        data={"enhancements": "remove_noise,normalize", "outputFormat": "mp3", "bitrateKbps": "192"},
    )
    assert response.status_code == 202, response.text
    body = response.json()
    assert body["jobType"] == "audio_clean"
    assert body["enhancements"] == ["remove_noise", "normalize"]
    job = runtime.repository.get(body["jobId"])
    assert job and Path(job.source_path).is_file()


def test_rejects_unknown_enhancement(api_client):
    client, *_ = api_client
    response = client.post(
        "/api/v1/audio/jobs",
        files={"file": ("podcast.mp3", io.BytesIO(b"bytes"), "audio/mpeg")},
        data={"enhancements": "make_it_pop"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UNKNOWN_ENHANCEMENT"


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg is required for the end-to-end cleanup test")
def test_worker_cleans_real_audio(api_client, tmp_path):
    client, runtime, _, _ = api_client
    tone = tmp_path / "tone.wav"
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", str(tone)],
        check=True,
    )
    response = client.post(
        "/api/v1/audio/jobs",
        files={"file": ("tone.wav", tone.read_bytes(), "audio/wav")},
        data={"enhancements": "remove_noise,normalize,auto_eq", "outputFormat": "mp3"},
    )
    job_id = response.json()["jobId"]
    run_audio_clean_job(job_id, runtime=runtime, settings=Settings(download_token_secret="test-secret-that-is-long-enough-for-hmac"))
    job = runtime.repository.get(job_id)
    assert job is not None
    assert job.status == JobStatus.READY, job.error_message
    assert job.final_filename and job.final_filename.endswith(".mp3")
    assert job.final_size_bytes and job.final_size_bytes > 0
