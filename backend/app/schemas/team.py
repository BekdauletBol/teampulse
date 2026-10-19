from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import TeamRole


class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    owner_id: int
    created_at: datetime


class TeamMemberOut(BaseModel):
    user_id: int
    email: EmailStr
    name: str
    role: TeamRole
    joined_at: datetime


class TeamDetailOut(TeamOut):
    members: list[TeamMemberOut]


class InviteLinkOut(BaseModel):
    invite_token: str
    invite_url: str


class TeamInvitePreview(BaseModel):
    """What a user sees on the join page before accepting an invite."""

    id: int
    name: str
    member_count: int
    already_member: bool
