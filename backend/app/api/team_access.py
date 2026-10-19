from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Team, TeamMember, User


def get_team_or_404(db: Session, team_id: int) -> Team:
    team = db.get(Team, team_id)
    if team is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team


def get_membership(db: Session, team_id: int, user_id: int) -> TeamMember | None:
    return db.scalar(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    )


def require_member(db: Session, team: Team, user: User) -> TeamMember:
    membership = get_membership(db, team.id, user.id)
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You are not a member of this team")
    return membership
