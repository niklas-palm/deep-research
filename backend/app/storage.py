"""Disk-based storage for research projects."""

import json
import os
import shutil
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .models import ProjectMetadata, ProjectStatus

DATA_DIR = Path(__file__).parent.parent / "data" / "projects"
SESSIONS_DIR = Path(__file__).parent.parent / "data" / "sessions"

_activity_lock = threading.Lock()
_INPUT_PREVIEW_LIMIT = 120


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _project_dir(project_id: str) -> Path:
    return DATA_DIR / project_id


def _read_metadata(project_id: str) -> dict:
    path = _project_dir(project_id) / "metadata.json"
    return json.loads(path.read_text())


def _write_metadata(project_id: str, data: dict):
    path = _project_dir(project_id) / "metadata.json"
    path.write_text(json.dumps(data, indent=2))


def create_project(
    title: str,
    query: str,
    parent_id: str | None = None,
    refinement: str | None = None,
) -> ProjectMetadata:
    project_id = str(uuid.uuid4())
    project_dir = _project_dir(project_id)
    project_dir.mkdir(parents=True, exist_ok=True)

    metadata = ProjectMetadata(
        id=project_id,
        title=title,
        query=query,
        status=ProjectStatus.PENDING,
        created_at=datetime.now(timezone.utc).isoformat(),
        parent_id=parent_id,
        refinement=refinement,
    )
    _write_metadata(project_id, metadata.model_dump())
    return metadata


def sessions_dir() -> Path:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    return SESSIONS_DIR


def _session_dir(project_id: str) -> Path:
    # Mirrors Strands FileSessionManager's on-disk layout: `session_<id>/`.
    return SESSIONS_DIR / f"session_{project_id}"


def list_child_projects(parent_id: str) -> list[ProjectMetadata]:
    return [p for p in list_projects() if p.parent_id == parent_id]


def get_project(project_id: str) -> ProjectMetadata:
    data = _read_metadata(project_id)
    return ProjectMetadata(**data)


def list_projects() -> list[ProjectMetadata]:
    if not DATA_DIR.exists():
        return []

    projects = []
    for project_dir in DATA_DIR.iterdir():
        if not project_dir.is_dir():
            continue
        meta_path = project_dir / "metadata.json"
        if meta_path.exists():
            data = json.loads(meta_path.read_text())
            projects.append(ProjectMetadata(**data))

    return sorted(projects, key=lambda p: p.created_at, reverse=True)


def update_project_status(
    project_id: str, status: ProjectStatus, error: str | None = None
):
    data = _read_metadata(project_id)
    data["status"] = status.value
    data["error"] = error
    if status == ProjectStatus.COMPLETED:
        data["completed_at"] = datetime.now(timezone.utc).isoformat()
    _write_metadata(project_id, data)


def save_report(project_id: str, report_md: str):
    path = _project_dir(project_id) / "report.md"
    path.write_text(report_md)


def delete_project(project_id: str):
    for child in list_child_projects(project_id):
        delete_project(child.id)
    d = _project_dir(project_id)
    if d.exists():
        shutil.rmtree(d)
    session = _session_dir(project_id)
    if session.exists():
        shutil.rmtree(session)


def get_report(project_id: str) -> str | None:
    path = _project_dir(project_id) / "report.md"
    if path.exists():
        return path.read_text()
    return None


def save_metrics(project_id: str, metrics: dict):
    path = _project_dir(project_id) / "metrics.json"
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(metrics, indent=2))
    os.replace(tmp, path)


def get_metrics(project_id: str) -> dict | None:
    path = _project_dir(project_id) / "metrics.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return None


# --- Activity log (live progress) ---


def _activity_path(project_id: str) -> Path:
    return _project_dir(project_id) / "activity.json"


def _read_activity(project_id: str) -> dict:
    path = _activity_path(project_id)
    default = {"researchers": [], "orchestrator_events": []}
    if not path.exists():
        return default
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError:
        return default
    data.setdefault("researchers", [])
    data.setdefault("orchestrator_events", [])
    return data


def _write_activity_atomic(project_id: str, data: dict):
    path = _activity_path(project_id)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, indent=2))
    os.replace(tmp, path)


def _find(items: list, key: str, value) -> dict | None:
    return next((item for item in items if item.get(key) == value), None)


def _input_preview(tool_name: str, tool_input: dict) -> str:
    if tool_name == "web_search":
        return str(tool_input.get("query", ""))[:_INPUT_PREVIEW_LIMIT]
    if tool_name == "web_fetch":
        return str(tool_input.get("url", ""))[:_INPUT_PREVIEW_LIMIT]
    return json.dumps(tool_input, default=str)[:_INPUT_PREVIEW_LIMIT]


def start_researcher(project_id: str, task: str) -> str:
    researcher_id = f"r-{uuid.uuid4().hex[:8]}"
    with _activity_lock:
        data = _read_activity(project_id)
        data["researchers"].append({
            "id": researcher_id,
            "task": task,
            "status": "running",
            "started_at": _now(),
            "tools": [],
        })
        _write_activity_atomic(project_id, data)
    return researcher_id


def upsert_tool_use(
    project_id: str,
    researcher_id: str,
    tool_use_id: str,
    tool_name: str,
    tool_input: dict,
):
    """Insert or update a tool-use entry keyed on tool_use_id.

    Strands emits many partial events per tool call as the input JSON streams
    in. We keep one entry per tool_use_id and update its preview as input
    grows, trimming the rolling window to the last N.
    """
    preview = _input_preview(tool_name, tool_input)
    with _activity_lock:
        data = _read_activity(project_id)
        researcher = _find(data["researchers"], "id", researcher_id)
        if researcher is None:
            return

        existing = _find(researcher["tools"], "tool_use_id", tool_use_id)
        if existing:
            if existing["input_preview"] == preview:
                return
            existing["input_preview"] = preview
        else:
            researcher["tools"].append({
                "tool_use_id": tool_use_id,
                "name": tool_name,
                "input_preview": preview,
                "ts": _now(),
            })

        _write_activity_atomic(project_id, data)


def increment_rate_limited(project_id: str, researcher_id: str):
    with _activity_lock:
        data = _read_activity(project_id)
        researcher = _find(data["researchers"], "id", researcher_id)
        if researcher is None:
            return
        researcher["rate_limited"] = researcher.get("rate_limited", 0) + 1
        _write_activity_atomic(project_id, data)


def complete_researcher(project_id: str, researcher_id: str):
    with _activity_lock:
        data = _read_activity(project_id)
        researcher = _find(data["researchers"], "id", researcher_id)
        if researcher is None:
            return
        researcher["status"] = "completed"
        researcher["completed_at"] = _now()
        _write_activity_atomic(project_id, data)


def set_researcher_span_id(project_id: str, researcher_id: str, span_id: str):
    """Stash the researcher's OTEL span id so the post-run evaluator can score that span."""
    with _activity_lock:
        data = _read_activity(project_id)
        researcher = _find(data["researchers"], "id", researcher_id)
        if researcher is None:
            return
        researcher["span_id"] = span_id
        _write_activity_atomic(project_id, data)


def set_researcher_findings(project_id: str, researcher_id: str, findings: str):
    """Persist the researcher's YAML output for later LLM-judge scoring."""
    with _activity_lock:
        data = _read_activity(project_id)
        researcher = _find(data["researchers"], "id", researcher_id)
        if researcher is None:
            return
        researcher["findings"] = findings
        _write_activity_atomic(project_id, data)


def upsert_orchestrator_tool_use(
    project_id: str,
    tool_use_id: str,
    tool_name: str,
    tool_input: dict,
):
    """Record a tool call made by the orchestrator itself (skipping researcher delegations)."""
    if tool_name == "researcher":
        return
    preview = _input_preview(tool_name, tool_input)
    with _activity_lock:
        data = _read_activity(project_id)
        existing = _find(data["orchestrator_events"], "tool_use_id", tool_use_id)
        if existing:
            if existing["input_preview"] == preview:
                return
            existing["input_preview"] = preview
        else:
            data["orchestrator_events"].append({
                "tool_use_id": tool_use_id,
                "name": tool_name,
                "input_preview": preview,
                "ts": _now(),
            })
        _write_activity_atomic(project_id, data)


def get_activity(project_id: str) -> dict:
    meta = _read_metadata(project_id)
    activity = _read_activity(project_id)
    return {
        "status": meta.get("status"),
        "error": meta.get("error"),
        "researchers": activity.get("researchers", []),
        "orchestrator_events": activity.get("orchestrator_events", []),
    }


def reset_project_for_retry(project_id: str):
    """Clear error state and activity so the project can be re-run from scratch."""
    data = _read_metadata(project_id)
    data["status"] = ProjectStatus.PENDING.value
    data["error"] = None
    data["completed_at"] = None
    _write_metadata(project_id, data)

    activity_path = _activity_path(project_id)
    if activity_path.exists():
        activity_path.unlink()


_IN_FLIGHT_STATUSES = {
    ProjectStatus.PENDING.value,
    ProjectStatus.PLANNING.value,
    ProjectStatus.RESEARCHING.value,
    ProjectStatus.SYNTHESIZING.value,
}


def recover_orphaned_projects(reason: str = "Server restarted before research finished") -> list[str]:
    """Mark any in-flight projects as errored on startup.

    Background research tasks die with the process; without this pass, the UI
    shows a spinner forever. Also marks any still-running researchers as
    interrupted so their cards render in a terminal state.
    """
    if not DATA_DIR.exists():
        return []

    recovered: list[str] = []
    for project_dir in DATA_DIR.iterdir():
        if not project_dir.is_dir():
            continue
        meta_path = project_dir / "metadata.json"
        if not meta_path.exists():
            continue
        meta = json.loads(meta_path.read_text())
        if meta.get("status") not in _IN_FLIGHT_STATUSES:
            continue

        meta["status"] = ProjectStatus.ERROR.value
        meta["error"] = reason
        meta_path.write_text(json.dumps(meta, indent=2))

        activity_path = project_dir / "activity.json"
        if activity_path.exists():
            try:
                activity = json.loads(activity_path.read_text())
            except json.JSONDecodeError:
                activity = {"researchers": []}
            changed = False
            for r in activity.get("researchers", []):
                if r.get("status") == "running":
                    r["status"] = "interrupted"
                    r["completed_at"] = _now()
                    changed = True
            if changed:
                _write_activity_atomic(meta["id"], activity)

        recovered.append(meta["id"])
    return recovered
