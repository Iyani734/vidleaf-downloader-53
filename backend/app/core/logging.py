from __future__ import annotations

import json
import logging
from datetime import UTC, datetime


class JsonFormatter(logging.Formatter):
    """Small dependency-free JSON formatter safe for API and worker logs."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for source, target in (
            ("request_id", "requestId"),
            ("job_id", "jobId"),
            ("error_code", "errorCode"),
            ("error_message", "errorMessage"),
            ("status_code", "statusCode"),
        ):
            value = getattr(record, source, None)
            if value:
                payload[target] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_json_logging(level: str) -> None:
    root = logging.getLogger()
    if getattr(root, "_vidleaf_json_configured", False):
        return
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())
    setattr(root, "_vidleaf_json_configured", True)
