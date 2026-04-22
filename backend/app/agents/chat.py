"""Per-project chat agent backed by Strands FileSessionManager.

One Strands session per project, stored under the project's directory. The
agent answers questions about the final report and each researcher's raw YAML
findings via tools — keeps the system prompt small and lets the model pull
only what it needs per turn.
"""

import logging
import os

from strands import Agent, tool
from strands.models.bedrock import BedrockModel
from strands.session import FileSessionManager

from .. import storage

logger = logging.getLogger("chat-agent")

_CHAT_MODEL_ID = "global.anthropic.claude-sonnet-4-6"
_AGENT_ID = "chat"

CHAT_PROMPT_TEMPLATE = """You are an assistant helping a portfolio manager understand a thematic investment report that has already been researched and synthesized.

The full report is included below. For deeper detail beyond what the report covers, you can pull each researcher's raw YAML findings via tools:
- `list_researchers` — the research sub-tasks that were run
- `get_researcher_findings(researcher_id)` — raw YAML findings for one researcher

Guidelines:
- Answer crisply and specifically. Cite numbers, sources, regulations, and ticker symbols directly from the report or findings.
- If a question isn't covered by the research, say so plainly — do not speculate or invent facts. Suggest that the user create a revision if they want deeper coverage.
- Only call `get_researcher_findings` when the report below doesn't have the detail the user asked for.

=== Report ===
{report}
"""


def _build_tools(project_id: str):
    @tool
    def list_researchers() -> list[dict]:
        """List the research sub-tasks that ran for this project.

        Returns a list of {id, task, status} dicts. Use an id with
        `get_researcher_findings` to pull the raw YAML for that researcher.
        """
        activity = storage.get_activity(project_id)
        return [
            {"id": r.get("id"), "task": r.get("task", ""), "status": r.get("status", "")}
            for r in activity.get("researchers", [])
        ]

    @tool
    def get_researcher_findings(researcher_id: str) -> str:
        """Return the raw YAML findings produced by a specific researcher."""
        activity = storage.get_activity(project_id)
        for r in activity.get("researchers", []):
            if r.get("id") == researcher_id:
                return r.get("findings") or "No findings recorded for this researcher."
        return f"No researcher with id {researcher_id}."

    return [list_researchers, get_researcher_findings]


def _session_manager(project_id: str) -> FileSessionManager:
    # One session per project, keyed on project_id. All sessions share a single
    # storage directory (data/sessions/) and FileSessionManager creates a
    # session_<project_id>/ folder under it as needed.
    return FileSessionManager(
        session_id=project_id,
        storage_dir=str(storage.sessions_dir()),
    )


def _build_agent(project_id: str) -> Agent:
    model = BedrockModel(
        model_id=_CHAT_MODEL_ID,
        max_tokens=4000,
        region_name=os.environ.get("BEDROCK_REGION", "eu-west-1"),
    )
    report = storage.get_report(project_id) or "(no report available)"
    system_prompt = CHAT_PROMPT_TEMPLATE.format(report=report)
    return Agent(
        agent_id=_AGENT_ID,
        name="chat",
        description="Answers questions about a completed thematic investment report.",
        model=model,
        system_prompt=system_prompt,
        tools=_build_tools(project_id),
        session_manager=_session_manager(project_id),
        callback_handler=None,
    )


def _messages_to_thread(messages: list[dict]) -> list[dict]:
    """Collapse Strands Messages (user/assistant + content blocks) into a flat
    thread of {role, content} dicts where content is the plain-text portion.
    Tool-use/tool-result blocks are skipped so the UI sees only the dialogue."""
    out: list[dict] = []
    for m in messages:
        role = m.get("role")
        if role not in ("user", "assistant"):
            continue
        text_parts: list[str] = []
        for block in m.get("content") or []:
            if isinstance(block, dict) and "text" in block:
                text_parts.append(block["text"])
        text = "\n".join(text_parts).strip()
        if not text:
            continue
        out.append({"role": role, "content": text})
    return out


async def reply(project_id: str, message: str) -> str:
    agent = _build_agent(project_id)
    result = await agent.invoke_async(message)
    return str(result).strip()


def history(project_id: str) -> list[dict]:
    """Return the chat history as a list of {role, content} dicts.

    Re-instantiating the Agent with the same FileSessionManager auto-hydrates
    `agent.messages` from disk, so we just read that — no direct file access."""
    try:
        agent = _build_agent(project_id)
    except Exception as e:
        logger.info(f"[chat] could not hydrate session for project {project_id}: {e}")
        return []
    return _messages_to_thread(agent.messages)
