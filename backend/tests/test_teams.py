from fastapi.testclient import TestClient

from app.config import settings


def auth_headers(client: TestClient, email: str, name: str = "User") -> dict[str, str]:
    r = client.post("/auth/register", json={"email": email, "password": "password123", "name": name})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def create_team(client: TestClient, headers: dict[str, str], name: str = "Alpha") -> dict:
    r = client.post("/teams", json={"name": name}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


# --- create -------------------------------------------------------------------


def test_create_team_adds_creator_as_owner(client: TestClient):
    owner = auth_headers(client, "owner@example.com", "Olive")
    team = create_team(client, owner, "Alpha")

    assert team["name"] == "Alpha"
    assert team["owner_id"] == 1
    assert "invite_token" not in team  # token only exposed via /invite
    assert len(team["members"]) == 1
    member = team["members"][0]
    assert member["user_id"] == 1
    assert member["email"] == "owner@example.com"
    assert member["name"] == "Olive"
    assert member["role"] == "owner"


def test_create_team_requires_auth(client: TestClient):
    assert client.post("/teams", json={"name": "Alpha"}).status_code == 401


def test_create_team_empty_name_rejected(client: TestClient):
    owner = auth_headers(client, "owner@example.com")
    assert client.post("/teams", json={"name": ""}, headers=owner).status_code == 422


def test_invite_tokens_are_unique_per_team(client: TestClient, db):
    from app.models import Team

    owner = auth_headers(client, "owner@example.com")
    create_team(client, owner, "A")
    create_team(client, owner, "B")
    tokens = [t.invite_token for t in db.query(Team).all()]
    assert len(tokens) == 2 and tokens[0] != tokens[1]
    assert all(len(t) >= 32 for t in tokens)


# --- list ---------------------------------------------------------------------


def test_list_teams_returns_only_my_teams(client: TestClient):
    owner = auth_headers(client, "owner@example.com")
    other = auth_headers(client, "other@example.com")
    create_team(client, owner, "Mine")
    create_team(client, other, "Theirs")

    r = client.get("/teams", headers=owner)
    assert r.status_code == 200
    assert [t["name"] for t in r.json()] == ["Mine"]


def test_list_teams_empty_for_new_user(client: TestClient):
    user = auth_headers(client, "new@example.com")
    assert client.get("/teams", headers=user).json() == []


# --- detail / access control ----------------------------------------------------


def test_get_team_as_member(client: TestClient):
    owner = auth_headers(client, "owner@example.com")
    team = create_team(client, owner)
    r = client.get(f"/teams/{team['id']}", headers=owner)
    assert r.status_code == 200
    assert r.json()["id"] == team["id"]
    assert len(r.json()["members"]) == 1


def test_get_team_non_member_403(client: TestClient):
    owner = auth_headers(client, "owner@example.com")
    stranger = auth_headers(client, "stranger@example.com")
    team = create_team(client, owner)

    r = client.get(f"/teams/{team['id']}", headers=stranger)
    assert r.status_code == 403
    assert r.json()["detail"] == "You are not a member of this team"


def test_get_team_unknown_id_404(client: TestClient):
    owner = auth_headers(client, "owner@example.com")
    assert client.get("/teams/999", headers=owner).status_code == 404


# --- invite link ---------------------------------------------------------------


def test_invite_link_owner_only(client: TestClient):
    owner = auth_headers(client, "owner@example.com")
    team = create_team(client, owner)

    r = client.get(f"/teams/{team['id']}/invite", headers=owner)
    assert r.status_code == 200
    body = r.json()
    assert body["invite_url"] == f"{settings.frontend_url.rstrip('/')}/join/{body['invite_token']}"


def test_invite_link_member_403(client: TestClient):
    owner = auth_headers(client, "owner@example.com")
    member = auth_headers(client, "member@example.com")
    team = create_team(client, owner)
    token = client.get(f"/teams/{team['id']}/invite", headers=owner).json()["invite_token"]
    assert client.post(f"/teams/join/{token}", headers=member).status_code == 200

    r = client.get(f"/teams/{team['id']}/invite", headers=member)
    assert r.status_code == 403
    assert r.json()["detail"] == "Only the team owner can view the invite link"


def test_invite_link_non_member_403(client: TestClient):
    owner = auth_headers(client, "owner@example.com")
    stranger = auth_headers(client, "stranger@example.com")
    team = create_team(client, owner)
    assert client.get(f"/teams/{team['id']}/invite", headers=stranger).status_code == 403


# --- join ---------------------------------------------------------------------


def test_join_by_link(client: TestClient):
    owner = auth_headers(client, "owner@example.com")
    joiner = auth_headers(client, "joiner@example.com", "Jo")
    team = create_team(client, owner)
    token = client.get(f"/teams/{team['id']}/invite", headers=owner).json()["invite_token"]

    r = client.post(f"/teams/join/{token}", headers=joiner)
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == team["id"]
    roles = {m["email"]: m["role"] for m in body["members"]}
    assert roles == {"owner@example.com": "owner", "joiner@example.com": "member"}

    # joiner can now see the team and it shows up in their list
    assert client.get(f"/teams/{team['id']}", headers=joiner).status_code == 200
    assert [t["id"] for t in client.get("/teams", headers=joiner).json()] == [team["id"]]


def test_join_is_idempotent(client: TestClient):
    owner = auth_headers(client, "owner@example.com")
    joiner = auth_headers(client, "joiner@example.com")
    team = create_team(client, owner)
    token = client.get(f"/teams/{team['id']}/invite", headers=owner).json()["invite_token"]

    first = client.post(f"/teams/join/{token}", headers=joiner)
    second = client.post(f"/teams/join/{token}", headers=joiner)
    assert first.status_code == second.status_code == 200
    assert len(second.json()["members"]) == 2


def test_owner_joining_own_team_keeps_owner_role(client: TestClient):
    owner = auth_headers(client, "owner@example.com")
    team = create_team(client, owner)
    token = client.get(f"/teams/{team['id']}/invite", headers=owner).json()["invite_token"]

    r = client.post(f"/teams/join/{token}", headers=owner)
    assert r.status_code == 200
    members = r.json()["members"]
    assert len(members) == 1
    assert members[0]["role"] == "owner"


def test_join_bad_token_404(client: TestClient):
    joiner = auth_headers(client, "joiner@example.com")
    r = client.post("/teams/join/definitely-not-a-token", headers=joiner)
    assert r.status_code == 404
    assert r.json()["detail"] == "Invalid invite link"


def test_join_requires_auth(client: TestClient):
    assert client.post("/teams/join/whatever").status_code == 401


# --- invite preview --------------------------------------------------------------


def test_preview_invite(client: TestClient):
    owner = auth_headers(client, "owner@example.com")
    joiner = auth_headers(client, "joiner@example.com")
    team = create_team(client, owner, "Alpha")
    token = client.get(f"/teams/{team['id']}/invite", headers=owner).json()["invite_token"]

    r = client.get(f"/teams/join/{token}", headers=joiner)
    assert r.status_code == 200
    assert r.json() == {"id": team["id"], "name": "Alpha", "member_count": 1, "already_member": False}

    client.post(f"/teams/join/{token}", headers=joiner)
    r = client.get(f"/teams/join/{token}", headers=joiner)
    assert r.json()["member_count"] == 2
    assert r.json()["already_member"] is True


def test_preview_invite_bad_token_404(client: TestClient):
    user = auth_headers(client, "u@example.com")
    assert client.get("/teams/join/nope", headers=user).status_code == 404


def test_preview_invite_requires_auth(client: TestClient):
    assert client.get("/teams/join/whatever").status_code == 401
