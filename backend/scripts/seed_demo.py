"""
Seed the Sprint Review demo data.

    cd backend && .venv/bin/python -m scripts.seed_demo

Creates (or refreshes) two demo users, the team "SE-2405 Demo" with both as members,
and six tasks spread across the three statuses with different deadlines and assignees.
Safe to re-run: the demo team is rebuilt from scratch, demo users keep their ids.
Respects DATABASE_URL like the app does and applies migrations first.
"""
from __future__ import annotations

import secrets
from datetime import date, timedelta
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import select

from app.config import settings
from app.core.security import hash_password
from app.database import SessionLocal
from app.models import Task, TaskReaction, TaskStatus, Team, TeamMember, TeamRole, User

TEAM_NAME = "SE-2405 Demo"
PASSWORD = "demo1234"
USERS = [
    {"email": "alex@demo.teampulse", "name": "Alex Kim"},
    {"email": "maria@demo.teampulse", "name": "Maria Lopez"},
]

# (title, description, deadline offset in days from today or None, assignee index or None, status, reactions)
TASKS = [
    ("write the problem statement", "one page: what we build and why it matters", -3, 0, TaskStatus.done, ["🔥", "❤️"]),
    ("set up the repo and ci", None, -6, 1, TaskStatus.done, ["✅"]),
    ("build the login flow", "register, login, /me — backend + screens", 0, 1, TaskStatus.in_progress, ["👀", "🔥"]),
    ("design the board screen", "three columns, drag and drop, status select fallback", 1, 0, TaskStatus.in_progress, []),
    ("prepare sprint review slides", "demo script + screenshots", 4, 0, TaskStatus.todo, ["😭"]),
    ("collect related work", "5-6 papers, one line each", 10, None, TaskStatus.todo, []),
]


def migrate() -> None:
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    cfg.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
    command.upgrade(cfg, "head")


def main() -> None:
    migrate()
    db = SessionLocal()
    try:
        users: list[User] = []
        for spec in USERS:
            user = db.scalar(select(User).where(User.email == spec["email"]))
            if user is None:
                user = User(email=spec["email"], name=spec["name"], password_hash=hash_password(PASSWORD))
                db.add(user)
            else:
                user.name = spec["name"]
                user.password_hash = hash_password(PASSWORD)
            users.append(user)
        db.flush()

        # rebuild the demo team so re-runs always give the same board
        for old in db.scalars(select(Team).where(Team.name == TEAM_NAME, Team.owner_id == users[0].id)).all():
            db.delete(old)
        db.flush()

        team = Team(name=TEAM_NAME, invite_token=secrets.token_urlsafe(32), owner_id=users[0].id)
        db.add(team)
        db.flush()
        db.add(TeamMember(team_id=team.id, user_id=users[0].id, role=TeamRole.owner))
        db.add(TeamMember(team_id=team.id, user_id=users[1].id, role=TeamRole.member))

        today = date.today()
        for title, description, offset, assignee_ix, status, reactions in TASKS:
            task = Task(
                team_id=team.id,
                title=title,
                description=description,
                deadline=today + timedelta(days=offset) if offset is not None else None,
                assignee_id=users[assignee_ix].id if assignee_ix is not None else None,
                status=status,
                created_by=users[0].id,
            )
            db.add(task)
            db.flush()
            for i, emoji in enumerate(reactions):
                # alternate who reacted so counts and "reacted_by_me" vary between the two logins
                db.add(TaskReaction(task_id=task.id, user_id=users[i % 2].id, emoji=emoji))
        db.commit()

        print(f"database : {settings.database_url}")
        print(f"team     : {TEAM_NAME} (id {team.id}, {len(TASKS)} tasks)")
        for u in users:
            print(f"user     : {u.email}  password: {PASSWORD}")
        print(f"invite   : {settings.frontend_url.rstrip('/')}/join/{team.invite_token}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
