"""Post-completion evaluator: runs judges, persists scores, pushes to Langfuse.

Scores are persisted to `data/projects/<id>/metrics.json` (which the UI reads
from) and pushed to the live Langfuse trace in the same pass.
"""

import logging
from datetime import datetime, timezone

from .. import storage
from . import judges
from .client import langfuse_client

logger = logging.getLogger("deep-research")


async def run_evaluators(project_id: str, trace_id: str | None) -> None:
    report = storage.get_report(project_id) or ""
    researchers = storage.get_activity(project_id).get("researchers", [])

    report_scores: list[dict] = []
    researcher_scores: list[dict] = []

    def _record(scores: list[dict], name: str, result: dict, data_type: str,
                observation_id: str | None = None, researcher_id: str | None = None):
        scores.append({
            "name": name,
            "value": result["value"],
            "data_type": data_type,
            "comment": result["comment"],
            "observation_id": observation_id,
            "researcher_id": researcher_id,
        })

    if report:
        _record(report_scores, "structure_compliance",
                judges.structure_compliance(report), "BOOLEAN")
        _record(report_scores, "citation_density",
                judges.citation_density(report), "NUMERIC")
        _record(report_scores, "source_diversity",
                judges.source_diversity(report), "NUMERIC")
        _record(report_scores, "data_specificity",
                judges.data_specificity(report), "NUMERIC")

    tasks = [r.get("task", "") for r in researchers]
    _record(report_scores, "plan_quality",
            await judges.plan_quality(tasks), "NUMERIC")

    for r in researchers:
        findings = r.get("findings", "")
        if not findings:
            continue
        result = await judges.research_quality(r.get("task", ""), findings)
        _record(
            researcher_scores,
            "research_quality",
            result,
            "NUMERIC",
            observation_id=r.get("span_id"),
            researcher_id=r.get("id"),
        )

    storage.save_metrics(project_id, {
        "trace_id": trace_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "report_scores": report_scores,
        "researcher_scores": researcher_scores,
    })

    if trace_id:
        client = langfuse_client()
        for s in report_scores:
            _push(client, trace_id, s)
        for s in researcher_scores:
            if s["observation_id"]:
                _push(client, trace_id, s)
        try:
            client.flush()
        except Exception as e:
            logger.warning(f"[evals] flush failed: {e}")

    logger.info(f"[evals] scored project {project_id} (trace {trace_id})")


def _push(client, trace_id: str, score: dict):
    try:
        client.create_score(
            trace_id=trace_id,
            observation_id=score.get("observation_id"),
            name=score["name"],
            value=score["value"],
            data_type=score["data_type"],
            comment=score["comment"],
        )
    except Exception as e:
        logger.warning(f"[evals] create_score({score['name']}) failed: {e}")
