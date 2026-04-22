"""FastAPI application for the Deep Research platform."""

import logging
from fastapi import FastAPI

from . import storage
from .routes import router
from .telemetry import init_tracing

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)

logger = logging.getLogger("deep-research")

app = FastAPI(title="Deep Research API")


@app.on_event("startup")
def startup():
    init_tracing()
    recovered = storage.recover_orphaned_projects()
    if recovered:
        logger.warning(f"Recovered {len(recovered)} orphaned project(s): {recovered}")


@app.on_event("shutdown")
def shutdown():
    from .evals.client import langfuse_client

    langfuse_client().flush()

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}
