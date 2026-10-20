from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic_core import PydanticCustomError

from app.models import TaskStatus

# Allowed task colours (uppercase hex). null means "no colour".
TASK_COLORS: dict[str, str] = {
    "#4F7BFF": "blue",
    "#F472B6": "pink",
    "#FB923C": "orange",
    "#FACC15": "yellow",
    "#34D399": "green",
    "#A78BFA": "purple",
    "#F87171": "red",
    "#94A3B8": "gray",
}

# Error type the API maps to 400 instead of the default 422 (see app.main).
INVALID_COLOR_ERROR = "invalid_task_color"


def validate_task_color(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().upper() if isinstance(value, str) else value
    if normalized not in TASK_COLORS:
        raise PydanticCustomError(
            INVALID_COLOR_ERROR,
            "color must be null or one of: {allowed}",
            {"allowed": ", ".join(TASK_COLORS)},
        )
    return normalized


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    deadline: date | None = None
    assignee_id: int | None = None
    color: str | None = None

    @field_validator("color", mode="before")
    @classmethod
    def _check_color(cls, v: object) -> str | None:
        return validate_task_color(v)  # type: ignore[arg-type]


class TaskUpdate(BaseModel):
    """All fields optional; only fields present in the request body are changed.
    Send `"assignee_id": null` / `"deadline": null` / `"color": null` to clear them."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    deadline: date | None = None
    assignee_id: int | None = None
    color: str | None = None

    @field_validator("color", mode="before")
    @classmethod
    def _check_color(cls, v: object) -> str | None:
        return validate_task_color(v)  # type: ignore[arg-type]


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
    color: str | None
    status: TaskStatus
    created_by: int
    created_at: datetime
    updated_at: datetime
    reactions: list[ReactionSummary] = []
