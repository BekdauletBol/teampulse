import pytest
from fastapi.testclient import TestClient


def auth_headers(client: TestClient, email: str, name: str = "User") -> dict[str, str]:
    r = client.post("/auth/register", json={"email": email, "password": "password123", "name": name})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def ctx(client: TestClient) -> dict:
    owner = auth_headers(client, "owner@example.com", "Owner")
    member = auth_headers(client, "member@example.com", "Member")
    stranger = auth_headers(client, "stranger@example.com", "Stranger")
    team = client.post("/teams", json={"name": "Alpha"}, headers=owner).json()
    token = client.get(f"/teams/{team['id']}/invite", headers=owner).json()["invite_token"]
    assert client.post(f"/teams/join/{token}", headers=member).status_code == 200
    task = client.post(f"/teams/{team['id']}/tasks", json={"title": "T"}, headers=owner).json()
    return {
        "owner": owner,
        "member": member,
        "stranger": stranger,
        "tasks_url": f"/teams/{team['id']}/tasks",
        "react_url": f"/teams/{team['id']}/tasks/{task['id']}/reactions",
        "task_id": task["id"],
    }


def reactions_from_list(client: TestClient, ctx: dict, headers: dict) -> list[dict]:
    tasks = client.get(ctx["tasks_url"], headers=headers).json()
    return next(t for t in tasks if t["id"] == ctx["task_id"])["reactions"]


# --- toggle -------------------------------------------------------------------


def test_toggle_on_then_off(client: TestClient, ctx):
    r = client.post(ctx["react_url"], json={"emoji": "🔥"}, headers=ctx["owner"])
    assert r.status_code == 200, r.text
    assert r.json()["reactions"] == [{"emoji": "🔥", "count": 1, "reacted_by_me": True}]
    assert reactions_from_list(client, ctx, ctx["owner"]) == [{"emoji": "🔥", "count": 1, "reacted_by_me": True}]

    r = client.post(ctx["react_url"], json={"emoji": "🔥"}, headers=ctx["owner"])
    assert r.status_code == 200
    assert r.json()["reactions"] == []
    assert reactions_from_list(client, ctx, ctx["owner"]) == []


def test_reactions_aggregate_across_users(client: TestClient, ctx):
    client.post(ctx["react_url"], json={"emoji": "🔥"}, headers=ctx["owner"])
    client.post(ctx["react_url"], json={"emoji": "🔥"}, headers=ctx["member"])
    client.post(ctx["react_url"], json={"emoji": "👀"}, headers=ctx["member"])

    assert reactions_from_list(client, ctx, ctx["owner"]) == [
        {"emoji": "🔥", "count": 2, "reacted_by_me": True},
        {"emoji": "👀", "count": 1, "reacted_by_me": False},
    ]
    assert reactions_from_list(client, ctx, ctx["member"]) == [
        {"emoji": "🔥", "count": 2, "reacted_by_me": True},
        {"emoji": "👀", "count": 1, "reacted_by_me": True},
    ]

    # removing one user's reaction only decrements the count
    client.post(ctx["react_url"], json={"emoji": "🔥"}, headers=ctx["owner"])
    assert reactions_from_list(client, ctx, ctx["owner"])[0] == {"emoji": "🔥", "count": 1, "reacted_by_me": False}


def test_same_user_multiple_emojis(client: TestClient, ctx):
    for e in ("💀", "😭", "❤️"):
        assert client.post(ctx["react_url"], json={"emoji": e}, headers=ctx["owner"]).status_code == 200
    # ordered by the allowed set, not by insertion
    assert [r["emoji"] for r in reactions_from_list(client, ctx, ctx["owner"])] == ["❤️", "💀", "😭"]


@pytest.mark.parametrize("emoji", ["🔥", "❤️", "💀", "😭", "👀"])
def test_all_allowed_emojis_accepted(client: TestClient, ctx, emoji):
    r = client.post(ctx["react_url"], json={"emoji": emoji}, headers=ctx["owner"])
    assert r.status_code == 200
    assert r.json()["reactions"][0]["emoji"] == emoji


# --- validation / access --------------------------------------------------------


@pytest.mark.parametrize("emoji", ["👍", "🎉", "fire", ":fire:", " ", "🔥🔥"])
def test_invalid_emoji_400(client: TestClient, ctx, emoji):
    r = client.post(ctx["react_url"], json={"emoji": emoji}, headers=ctx["owner"])
    assert r.status_code == 400, r.text
    assert r.json()["detail"].startswith("Unsupported emoji")
    assert reactions_from_list(client, ctx, ctx["owner"]) == []


def test_missing_emoji_422(client: TestClient, ctx):
    assert client.post(ctx["react_url"], json={}, headers=ctx["owner"]).status_code == 422


def test_non_member_403(client: TestClient, ctx):
    r = client.post(ctx["react_url"], json={"emoji": "🔥"}, headers=ctx["stranger"])
    assert r.status_code == 403
    assert reactions_from_list(client, ctx, ctx["owner"]) == []


def test_requires_auth(client: TestClient, ctx):
    assert client.post(ctx["react_url"], json={"emoji": "🔥"}).status_code == 401


def test_unknown_task_404(client: TestClient, ctx):
    r = client.post(f"{ctx['tasks_url']}/999/reactions", json={"emoji": "🔥"}, headers=ctx["owner"])
    assert r.status_code == 404


# --- integration with other task responses -------------------------------------


def test_new_task_has_empty_reactions(client: TestClient, ctx):
    r = client.post(ctx["tasks_url"], json={"title": "fresh"}, headers=ctx["owner"])
    assert r.json()["reactions"] == []


def test_status_and_patch_responses_include_reactions(client: TestClient, ctx):
    client.post(ctx["react_url"], json={"emoji": "👀"}, headers=ctx["member"])
    base = f"{ctx['tasks_url']}/{ctx['task_id']}"
    r = client.patch(f"{base}/status", json={"status": "done"}, headers=ctx["owner"])
    assert r.json()["reactions"] == [{"emoji": "👀", "count": 1, "reacted_by_me": False}]
    r = client.patch(base, json={"title": "renamed"}, headers=ctx["member"])
    assert r.json()["reactions"] == [{"emoji": "👀", "count": 1, "reacted_by_me": True}]


def test_reaction_does_not_bump_updated_at(client: TestClient, ctx):
    before = client.get(ctx["tasks_url"], headers=ctx["owner"]).json()[0]["updated_at"]
    after = client.post(ctx["react_url"], json={"emoji": "🔥"}, headers=ctx["owner"]).json()["updated_at"]
    assert before == after


def test_deleting_task_removes_reactions(client: TestClient, ctx, db):
    from app.models import TaskReaction

    client.post(ctx["react_url"], json={"emoji": "🔥"}, headers=ctx["owner"])
    assert db.query(TaskReaction).count() == 1
    assert client.delete(f"{ctx['tasks_url']}/{ctx['task_id']}", headers=ctx["owner"]).status_code == 204
    db.expire_all()
    assert db.query(TaskReaction).count() == 0
