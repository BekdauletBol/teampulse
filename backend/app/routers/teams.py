import secrets

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import CurrentUser, DbSession
from app.api.team_access import get_membership, get_team_or_404, require_member
from app.config import settings
from app.models import Team, TeamMember, TeamRole, User
from app.schemas.team import (
    InviteLinkOut,
    TeamCreate,
    TeamDetailOut,
    TeamInvitePreview,
    TeamMemberOut,
    TeamOut,
)

router = APIRouter(prefix="/teams", tags=["teams"])


# --- helpers ------------------------------------------------------------------


def _generate_invite_token(db: Session) -> str:
    # 32 random bytes -> 43 url-safe chars; fits the String(64) column.
    for _ in range(5):
        token = secrets.token_urlsafe(32)
        if db.scalar(select(Team.id).where(Team.invite_token == token)) is None:
            return token
    raise RuntimeError("could not generate a unique invite token")  # pragma: no cover


def _team_detail(db: Session, team: Team) -> TeamDetailOut:
    rows = db.execute(
        select(TeamMember, User)
        .join(User, User.id == TeamMember.user_id)
        .where(TeamMember.team_id == team.id)
        .order_by(TeamMember.joined_at, TeamMember.id)
    ).all()
    return TeamDetailOut(
        id=team.id,
        name=team.name,
        owner_id=team.owner_id,
        created_at=team.created_at,
        members=[
            TeamMemberOut(
                user_id=user.id, email=user.email, name=user.name, role=member.role, joined_at=member.joined_at
            )
            for member, user in rows
        ],
    )


# --- routes -------------------------------------------------------------------


@router.post("", response_model=TeamDetailOut, status_code=status.HTTP_201_CREATED)
def create_team(payload: TeamCreate, db: DbSession, current_user: CurrentUser) -> TeamDetailOut:
    team = Team(name=payload.name.strip(), invite_token=_generate_invite_token(db), owner_id=current_user.id)
    db.add(team)
    db.flush()  # assign team.id
    db.add(TeamMember(team_id=team.id, user_id=current_user.id, role=TeamRole.owner))
    db.commit()
    db.refresh(team)
    return _team_detail(db, team)


@router.get("", response_model=list[TeamOut])
def list_my_teams(db: DbSession, current_user: CurrentUser) -> list[Team]:
    return list(
        db.scalars(
            select(Team)
            .join(TeamMember, TeamMember.team_id == Team.id)
            .where(TeamMember.user_id == current_user.id)
            .order_by(Team.created_at, Team.id)
        ).all()
    )


# Registered before /{team_id} routes so "join" is never read as a team id.
@router.get("/join/{token}", response_model=TeamInvitePreview)
def preview_invite(token: str, db: DbSession, current_user: CurrentUser) -> TeamInvitePreview:
    team = db.scalar(select(Team).where(Team.invite_token == token))
    if team is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Invalid invite link")
    member_count = db.scalar(select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team.id)) or 0
    return TeamInvitePreview(
        id=team.id,
        name=team.name,
        member_count=member_count,
        already_member=get_membership(db, team.id, current_user.id) is not None,
    )


@router.post("/join/{token}", response_model=TeamDetailOut)
def join_team(token: str, db: DbSession, current_user: CurrentUser) -> TeamDetailOut:
    team = db.scalar(select(Team).where(Team.invite_token == token))
    if team is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Invalid invite link")

    if get_membership(db, team.id, current_user.id) is None:
        db.add(TeamMember(team_id=team.id, user_id=current_user.id, role=TeamRole.member))
        try:
            db.commit()
        except IntegrityError:
            # concurrent join by the same user: already a member, which is fine
            db.rollback()
    return _team_detail(db, team)


@router.get("/{team_id}", response_model=TeamDetailOut)
def get_team(team_id: int, db: DbSession, current_user: CurrentUser) -> TeamDetailOut:
    team = get_team_or_404(db, team_id)
    require_member(db, team, current_user)
    return _team_detail(db, team)


@router.get("/{team_id}/invite", response_model=InviteLinkOut)
def get_invite_link(team_id: int, db: DbSession, current_user: CurrentUser) -> InviteLinkOut:
    team = get_team_or_404(db, team_id)
    membership = require_member(db, team, current_user)
    if membership.role != TeamRole.owner:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only the team owner can view the invite link")
    base = settings.frontend_url.rstrip("/")
    return InviteLinkOut(invite_token=team.invite_token, invite_url=f"{base}/join/{team.invite_token}")
