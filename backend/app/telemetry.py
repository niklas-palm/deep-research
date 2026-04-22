"""Langfuse tracing setup. Called once at FastAPI startup, before any Agent is constructed."""

import base64
import logging
import os

from strands.telemetry import StrandsTelemetry

logger = logging.getLogger("deep-research")


def init_tracing() -> None:
    auth = base64.b64encode(
        f"{os.environ['LANGFUSE_PUBLIC_KEY']}:{os.environ['LANGFUSE_SECRET_KEY']}".encode()
    ).decode()
    os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Basic {auth}"
    os.environ.setdefault("OTEL_EXPORTER_OTLP_ENDPOINT", os.environ["LANGFUSE_OTEL_ENDPOINT"])
    os.environ.setdefault("OTEL_SERVICE_NAME", "deep-research")

    StrandsTelemetry().setup_otlp_exporter()
    logger.info(f"Langfuse tracing enabled → {os.environ['LANGFUSE_HOST']}")
