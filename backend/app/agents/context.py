"""Shared context for agent runs.

`project_id_var` lets the researcher tool know which project it's running
under, so it can publish tool-use activity without taking project_id as a
tool argument (tool args are chosen by the LLM).
"""

from contextvars import ContextVar

project_id_var: ContextVar[str | None] = ContextVar("project_id", default=None)
researcher_id_var: ContextVar[str | None] = ContextVar("researcher_id", default=None)
