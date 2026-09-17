from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.mark.manual
@pytest.mark.skipif(not os.getenv("VIDLEAF_E2E_URL"), reason="Set VIDLEAF_E2E_URL to an authorized public test video.")
def test_authorized_public_video_can_be_queued_manually() -> None:
    # This intentionally tests only enqueueing. Follow its SSE/status link in a real running stack
    # to verify provider access, egress, FFmpeg, and storage for your environment.
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/downloads",
            json={"url": os.environ["VIDLEAF_E2E_URL"], "quality": "360p", "container": "mp4"},
        )
    assert response.status_code == 202, response.text
