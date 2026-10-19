from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    deadline: date | None = None
    assignee_id: int | None = None


class TaskUpdate(BaseModel):
    """All fields optional; only fields present in the request body are changed.
    Send `"assignee_id": null` / `"deadline": null` to clear them."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    deadline: date | None = None
    assignee_id: int | None = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class ReactionToggle(BaseModel):
    emoji: str = Field(min_length=1, max_length=16)


class ReactionSummary(BaseModel):
    emoji: str
    count: int
    reacted_by_me: bool


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    team_id: int
    title: str
    description: str | None
    deadline: date | None
    assignee_id: int | None
    status: TaskStatus
    created_by: int
    created_at: datetime
    updated_at: datetime
    reactions: list[ReactionSummary] = []
