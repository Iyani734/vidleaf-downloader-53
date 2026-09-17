# VidLeaf backend

Production-oriented FastAPI backend for VidLeaf. It accepts only normalized public YouTube video URLs, queues downloads through Redis/RQ in production, uses yt-dlp only from workers, merges server-selected streams with FFmpeg, validates files with FFprobe when available, and delivers private completed files through short-lived authorized links.

> Terms notice: use this service only for publicly accessible videos you own or have permission to download. It intentionally does not bypass DRM, sign-in, private-video access, age gates, geographic restrictions, or other access controls.

## What is included

- `POST /api/v1/videos/analyze` caches metadata and only returns available container/quality choices.
- `POST /api/v1/downloads` returns `202` immediately; CPU/network work is performed by a separate RQ worker.
- Polling, SSE progress, cancellation, retry, owner-scoped history, and short-lived file URLs.
- MP4/WebM video plus M4A and FFmpeg-produced MP3. Separate high-resolution streams are downloaded and merged without unnecessary transcoding.
- Local private storage for development and S3-compatible private object storage in production.
- Expiry cleanup, FFmpeg/FFprobe validation, rate limiting, size/duration/disk safeguards, CORS, request IDs, and consistent error payloads.

Redis is deliberately the ephemeral job store: jobs and files expire together, so this backend does not need PostgreSQL for its stated download-job lifecycle. Use a separate authenticated account service/database if you need durable user history or billing records.

## Local quick start without Docker

This checkout includes a local `.env` for Windows development:

- `QUEUE_BACKEND=local` runs jobs in a background thread inside the API process.
- `DATA_DIR=./data` keeps completed files private under `backend/data`.
- `imageio-ffmpeg` provides a portable FFmpeg binary if system FFmpeg is not installed.
- The frontend proxies `/api` from `http://127.0.0.1:8080` to the API on port `8000`.

From this directory:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Then run the frontend from the repository root:

```powershell
npm run dev
```

Open `http://127.0.0.1:8080`. Paste a public YouTube URL that you own or have permission to download, choose a format, wait for the job to reach Ready, then click `Download file`.

For the cleanest output, pick the highest actual resolution shown in the format list (`4K / 2160p`, `Full HD / 1080p`, etc.). VidLeaf does not invent 4K: it can only offer 2160p when YouTube exposes that stream for the specific video. If anonymous YouTube access only exposes low formats or asks for browser verification, export a Netscape-format `cookies.txt` file from a browser session you are allowed to use and set `YOUTUBE_COOKIES_FILE=C:\path\to\cookies.txt` in `.env`, then restart the API. Do not use cookies to access private, paid, age-gated, or otherwise unauthorized videos.

## Redis/RQ quick start

Install Python 3.12+, Redis, and FFmpeg/FFprobe, then from this directory:

```powershell
Copy-Item .env.example .env
# Edit .env and replace DOWNLOAD_TOKEN_SECRET with a long random value.
# Keep QUEUE_BACKEND=redis.
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
$env:REDIS_URL = "redis://localhost:6379/0"
uvicorn app.main:app --reload --port 8000
```

In a second terminal, with the virtual environment active:

```powershell
python -m app.worker
```

Redis must be running before either process starts. The interactive API documentation is at `http://localhost:8000/docs`; readiness is `GET /health/ready`.

For containers, copy `.env.example` to `.env`, set a real token secret, then run:

```sh
docker compose up --build
```

The compose stack has separate `api`, `worker`, and `cleanup` services. Each worker process handles one media job at a time; scale worker replicas only after sizing CPU, egress, and disk capacity.

## API contract and frontend mapping

All responses use camelCase. Requests use the session cookie automatically issued by the API; browser fetches must use `credentials: "include"`. The cookie plus owner record prevent a second browser from reading, cancelling, or downloading another browser's job.

| Frontend action | Endpoint | Important response fields |
| --- | --- | --- |
| Paste a URL | `POST /api/v1/videos/analyze` | `videoId`, `title`, `thumbnail`, `durationSeconds`, `formats` |
| Start | `POST /api/v1/downloads` | `jobId`, `status`, `estimatedSizeBytes` |
| Live card | `GET /api/v1/downloads/{jobId}/events` | SSE `progress` event containing status, progress, speed, and ETA |
| Poll fallback | `GET /api/v1/downloads/{jobId}` | Same status/progress fields plus `downloadUrl` once ready |
| Cancel / retry | `DELETE /api/v1/downloads/{jobId}` / `POST .../retry` | Owner-scoped job response |
| Completed history | `GET /api/v1/downloads` | Owner-scoped `jobs` list |

Example analysis request:

```json
{ "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
```

Example download request:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "quality": "2160p",
  "container": "mp4",
  "allowQualityFallback": false
}
```

For audio use `"quality": "audio"` and `"audioFormat": "m4a"`, `"mp3"`, or `"best"`; `audioBitrateKbps` accepts 128, 192, or 320 for MP3. The API never accepts a raw yt-dlp selector or command-line argument. If a requested resolution is not available, it returns `QUALITY_NOT_AVAILABLE` with `availableQualities`; lower fallback only occurs when `allowQualityFallback` is explicitly `true`.

Every error has this shape:

```json
{
  "error": {
    "code": "QUALITY_NOT_AVAILABLE",
    "message": "4K is not available for this video.",
    "details": { "availableQualities": ["1440p", "1080p"] },
    "requestId": "req_..."
  }
}
```

## Operations and security

- Put the API behind TLS and set `ENVIRONMENT=production`, `SECURE_COOKIES=true`, a specific `CORS_ORIGINS` list, and a unique `DOWNLOAD_TOKEN_SECRET` (32+ random bytes). Never commit `.env`.
- Keep local `DATA_DIR` outside any public web root. For production, set `STORAGE_BACKEND=s3` and use a private bucket; the API redirects an authenticated requester to a short-lived object-store URL.
- Install exact FFmpeg/FFprobe versions in the image. Update yt-dlp deliberately in a tested image build; do not self-update it at runtime.
- Nginx configuration is in `deploy/nginx.conf.example`. It forwards SSE without buffering and applies an edge rate limit. Configure a trusted proxy before relying on forwarded client IPs.
- The cleanup service marks expired records, removes local/S3 files, and prunes orphaned local job directories. Add an object-store lifecycle policy as a crash-safe second layer.
- `/health/live` checks process liveness. `/health/ready` checks Redis/RQ connectivity. `/metrics` emits lightweight Prometheus-style HTTP counters; restrict it to internal monitoring at the proxy. JSON logs include `requestId` and job IDs; token query strings are never logged.

## Tests

```powershell
pytest
```

Normal tests mock extraction and media subprocesses; they never call YouTube. To run the opt-in manual smoke test against a public video you are authorized to test, start the API/worker, set `VIDLEAF_E2E_URL`, then run:

```powershell
$env:VIDLEAF_E2E_URL = "https://www.youtube.com/watch?v=your-authorized-small-test-video"
pytest -m manual
```
