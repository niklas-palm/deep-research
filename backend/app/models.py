from enum import Enum
from pydantic import BaseModel


class ProjectStatus(str, Enum):
    PENDING = "pending"
    PLANNING = "planning"
    RESEARCHING = "researching"
    SYNTHESIZING = "synthesizing"
    COMPLETED = "completed"
    ERROR = "error"


class ProjectMetadata(BaseModel):
    id: str
    title: str
    query: str
    status: ProjectStatus
    created_at: str
    completed_at: str | None = None
    error: str | None = None
    parent_id: str | None = None
    refinement: str | None = None


class CreateProjectRequest(BaseModel):
    query: str = ""
    parent_id: str | None = None
    refinement: str | None = None


class ChatRequest(BaseModel):
    message: str
