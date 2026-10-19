from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import case, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.api.team_access import get_membership, get_team_or_404, require_member
from app.models import ALLOWED_REACTIONS, Task, TaskReaction, TaskStatus, Team, User
from app.schemas.task import (
    ReactionSummary,
    ReactionToggle,
    TaskCreate,
    TaskOut,
    TaskStatusUpdate,
    TaskUpdate,
)

router = APIRouter(prefix="/teams/{team_id}/tasks", tags=["tasks"])


# --- helpers ------------------------------------------------------------------


def _load_team_for_member(db: Session, team_id: int, user: User) -> Team:
    team = get_team_or_404(db, team_id)
    require_member(db, team, user)
    return team


def _get_task_or_404(db: Session, team: Team, task_id: int) -> Task:
    task = db.scalar(select(Task).where(Task.id == task_id, Task.team_id == team.id))
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


def _validate_assignee(db: Session, team: Team, assignee_id: int | None) -> None:
    if assignee_id is None:
        return
    if get_membership(db, team.id, assignee_id) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Assignee must be a member of this team")


def _touch(task: Task) -> None:
    # Explicit so the bump has sub-second precision and does not rely on the DB clock.
    task.updated_at = datetime.now(timezone.utc)


def _reactions_by_task(db: Session, task_ids: list[int], viewer: User) -> dict[int, list[ReactionSummary]]:
    """One grouped query: per (task, emoji) -> count and whether the viewer reacted."""
    result: dict[int, list[ReactionSummary]] = {tid: [] for tid in task_ids}
    if not task_ids:
        return result
    mine = func.max(case((TaskReaction.user_id == viewer.id, 1), else_=0))
    rows = db.execute(
        select(TaskReaction.task_id, TaskReaction.emoji, func.count().label("count"), mine.label("mine"))
        .where(TaskReaction.task_id.in_(task_ids))
        .group_by(TaskReaction.task_id, TaskReaction.emoji)
    ).all()
    order = {e: i for i, e in enumerate(ALLOWED_REACTIONS)}
    for task_id, emoji, count, is_mine in rows:
        result[task_id].append(ReactionSummary(emoji=emoji, count=count, reacted_by_me=bool(is_mine)))
    for summaries in result.values():
        summaries.sort(key=lambda r: order.get(r.emoji, len(order)))
    return result


def _task_out(db: Session, task: Task, viewer: User) -> TaskOut:
    return _tasks_out(db, [task], viewer)[0]


_TASK_COLUMNS = tuple(f for f in TaskOut.model_fields if f != "reactions")


def _tasks_out(db: Session, tasks: list[Task], viewer: User) -> list[TaskOut]:
    reactions = _reactions_by_task(db, [t.id for t in tasks], viewer)
    # Build from columns explicitly so the ORM `Task.reactions` relationship is never
    # lazy-loaded or mistaken for the aggregated summaries.
    return [
        TaskOut(**{col: getattr(t, col) for col in _TASK_COLUMNS}, reactions=reactions[t.id]) for t in tasks
    ]


# --- routes -------------------------------------------------------------------


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(team_id: int, payload: TaskCreate, db: DbSession, current_user: CurrentUser) -> TaskOut:
    team = _load_team_for_member(db, team_id, current_user)
    _validate_assignee(db, team, payload.assignee_id)

    task = Task(
        team_id=team.id,
        title=payload.title.strip(),
        description=payload.description,
        deadline=payload.deadline,
        assignee_id=payload.assignee_id,
        status=TaskStatus.todo,
        created_by=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_out(db, task, current_user)


@router.get("", response_model=list[TaskOut])
def list_tasks(
    team_id: int,
    db: DbSession,
    current_user: CurrentUser,
    status_filter: TaskStatus | None = Query(default=None, alias="status"),
    assignee_id: int | None = Query(default=None),
) -> list[TaskOut]:
    team = _load_team_for_member(db, team_id, current_user)
    stmt = select(Task).where(Task.team_id == team.id)
    if status_filter is not None:
        stmt = stmt.where(Task.status == status_filter)
    if assignee_id is not None:
        stmt = stmt.where(Task.assignee_id == assignee_id)
    stmt = stmt.order_by(Task.created_at, Task.id)
    return _tasks_out(db, list(db.scalars(stmt).all()), current_user)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    team_id: int, task_id: int, payload: TaskUpdate, db: DbSession, current_user: CurrentUser
) -> TaskOut:
    team = _load_team_for_member(db, team_id, current_user)
    task = _get_task_or_404(db, team, task_id)

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    if "assignee_id" in changes:
        _validate_assignee(db, team, changes["assignee_id"])
    if "title" in changes:
        changes["title"] = changes["title"].strip()

    for field, value in changes.items():
        setattr(task, field, value)
    _touch(task)
    db.commit()
    db.refresh(task)
    return _task_out(db, task, current_user)


@router.patch("/{task_id}/status", response_model=TaskOut)
def update_task_status(
    team_id: int, task_id: int, payload: TaskStatusUpdate, db: DbSession, current_user: CurrentUser
) -> TaskOut:
    team = _load_team_for_member(db, team_id, current_user)
    task = _get_task_or_404(db, team, task_id)

    task.status = payload.status
    _touch(task)
    db.commit()
    db.refresh(task)
    return _task_out(db, task, current_user)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(team_id: int, task_id: int, db: DbSession, current_user: CurrentUser) -> Response:
    team = _load_team_for_member(db, team_id, current_user)
    task = _get_task_or_404(db, team, task_id)

    if task.created_by != current_user.id and team.owner_id != current_user.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, detail="Only the task creator or the team owner can delete this task"
        )
    db.delete(task)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{task_id}/reactions", response_model=TaskOut)
def toggle_reaction(
    team_id: int, task_id: int, payload: ReactionToggle, db: DbSession, current_user: CurrentUser
) -> TaskOut:
    """Toggle the caller's reaction: adds it if absent, removes it if already present."""
    team = _load_team_for_member(db, team_id, current_user)
    task = _get_task_or_404(db, team, task_id)

    emoji = payload.emoji.strip()
    if emoji not in ALLOWED_REACTIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported emoji. Allowed: {' '.join(ALLOWED_REACTIONS)}",
        )

    existing = db.scalar(
        select(TaskReaction).where(
            TaskReaction.task_id == task.id,
            TaskReaction.user_id == current_user.id,
            TaskReaction.emoji == emoji,
        )
    )
    if existing is not None:
        db.delete(existing)
        db.commit()
    else:
        db.add(TaskReaction(task_id=task.id, user_id=current_user.id, emoji=emoji))
        try:
            db.commit()
        except IntegrityError:
            # concurrent double-tap: the reaction already exists, which is the "on" state
            db.rollback()
    return _task_out(db, task, current_user)
