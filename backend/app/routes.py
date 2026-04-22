"""API routes for research projects."""

import asyncio
import logging
import re

from fastapi import APIRouter, HTTPException

from . import storage
from .agents.title import infer_title
from .models import ChatRequest, CreateProjectRequest, ProjectMetadata, ProjectStatus

logger = logging.getLogger("deep-research")

router = APIRouter(prefix="/api")

_HEADING_RE = re.compile(r"^#\s", re.MULTILINE)


def _require_project(project_id: str) -> ProjectMetadata:
    try:
        return storage.get_project(project_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")


def _revision_prompt(parent: ProjectMetadata, parent_report: str, refinement: str) -> str:
    return (
        "This is a revision of a prior thematic investment report. Build on the prior "
        "context and focus the new research on the user's refinement.\n\n"
        f"Prior report title: {parent.title}\n\n"
        "=== Prior Research Report ===\n"
        f"{parent_report}\n\n"
        "=== Refinement focus ===\n"
        f"{refinement}"
    )


@router.get("/projects")
def list_projects() -> list[dict]:
    return [p.model_dump() for p in storage.list_projects()]


@router.post("/projects")
async def create_project(req: CreateProjectRequest) -> dict:
    if req.parent_id:
        refinement = (req.refinement or "").strip()
        if not refinement:
            raise HTTPException(status_code=400, detail="Refinement is required for revisions")
        try:
            parent = storage.get_project(req.parent_id)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Parent project not found")
        parent_report = storage.get_report(req.parent_id)
        if not parent_report:
            raise HTTPException(
                status_code=400,
                detail="Parent project has no report yet — cannot create a revision",
            )
        query, orchestrator_input = refinement, _revision_prompt(parent, parent_report, refinement)
    else:
        query = (req.query or "").strip()
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        orchestrator_input = query

    project = storage.create_project(
        title=infer_title(query),
        query=query,
        parent_id=req.parent_id,
        refinement=req.refinement,
    )
    asyncio.create_task(run_research(project.id, orchestrator_input))
    return project.model_dump()


@router.get("/projects/{project_id}")
def get_project(project_id: str) -> dict:
    return _require_project(project_id).model_dump()


@router.delete("/projects/{project_id}")
def delete_project(project_id: str) -> dict:
    _require_project(project_id)
    storage.delete_project(project_id)
    return {"ok": True}


@router.post("/projects/{project_id}/retry")
async def retry_project(project_id: str) -> dict:
    project = _require_project(project_id)
    if project.status != ProjectStatus.ERROR:
        raise HTTPException(status_code=400, detail="Only errored projects can be retried")

    storage.reset_project_for_retry(project_id)
    asyncio.create_task(run_research(project_id, project.query))
    return storage.get_project(project_id).model_dump()


@router.get("/projects/{project_id}/report")
def get_report(project_id: str) -> dict:
    report = storage.get_report(project_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"report": report}


@router.get("/projects/{project_id}/metrics")
def get_metrics(project_id: str) -> dict:
    _require_project(project_id)
    metrics = storage.get_metrics(project_id)
    if metrics is None:
        raise HTTPException(status_code=404, detail="Metrics not available yet")
    return metrics


@router.get("/projects/{project_id}/activity")
def get_activity(project_id: str) -> dict:
    _require_project(project_id)
    return storage.get_activity(project_id)


@router.get("/projects/{project_id}/chat")
def get_chat(project_id: str) -> dict:
    _require_project(project_id)
    from .agents.chat import history
    return {"messages": history(project_id)}


@router.post("/projects/{project_id}/chat")
async def post_chat(project_id: str, req: ChatRequest) -> dict:
    project = _require_project(project_id)
    if project.status != ProjectStatus.COMPLETED:
        raise HTTPException(
            status_code=400, detail="Chat is available once the report is ready"
        )
    message = (req.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    from .agents.chat import reply
    answer = await reply(project_id, message)
    return {"reply": answer}


async def run_research(project_id: str, query: str) -> None:
    """Background task driving one project through the research pipeline.

    State machine: PLANNING → RESEARCHING/SYNTHESIZING (set inside the
    orchestrator) → COMPLETED. Any exception flips the project to ERROR with
    the exception string surfaced to the UI.

    Orchestrator output often starts with a small preamble (e.g. "Here is the
    report:"); we strip anything before the first top-level `#` heading so the
    stored `report.md` begins cleanly with the title.

    Evaluators always run in the background after completion — scores are
    persisted to `metrics.json` and pushed to the live Langfuse trace.
    """
    try:
        storage.update_project_status(project_id, ProjectStatus.PLANNING)

        from .agents.orchestrator import run_orchestrator

        raw, trace_id = await run_orchestrator(project_id, query)

        match = _HEADING_RE.search(raw)
        report = raw[match.start():] if match else raw

        storage.save_report(project_id, report)
        storage.update_project_status(project_id, ProjectStatus.COMPLETED)
        logger.info(f"Research completed for project {project_id}")

        from .evals.runner import run_evaluators
        asyncio.create_task(run_evaluators(project_id, trace_id))

    except Exception as e:
        logger.error(f"Research failed for project {project_id}: {e}", exc_info=True)
        storage.update_project_status(
            project_id, ProjectStatus.ERROR, error=str(e)
        )
