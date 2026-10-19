from datetime import datetime

import pytest
from fastapi.testclient import TestClient


def auth_headers(client: TestClient, email: str, name: str = "User") -> dict[str, str]:
    r = client.post("/auth/register", json={"email": email, "password": "password123", "name": name})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def user_id(client: TestClient, headers: dict[str, str]) -> int:
    return client.get("/auth/me", headers=headers).json()["id"]


@pytest.fixture
def team(client: TestClient) -> dict:
    """Team with an owner and one member, plus a registered stranger."""
    owner = auth_headers(client, "owner@example.com", "Owner")
    member = auth_headers(client, "member@example.com", "Member")
    stranger = auth_headers(client, "stranger@example.com", "Stranger")
    t = client.post("/teams", json={"name": "Alpha"}, headers=owner).json()
    token = client.get(f"/teams/{t['id']}/invite", headers=owner).json()["invite_token"]
    assert client.post(f"/teams/join/{token}", headers=member).status_code == 200
    return {
        "id": t["id"],
        "url": f"/teams/{t['id']}/tasks",
        "owner": owner,
        "member": member,
        "stranger": stranger,
        "owner_id": user_id(client, owner),
        "member_id": user_id(client, member),
        "stranger_id": user_id(client, stranger),
    }


# --- create -------------------------------------------------------------------


def test_create_task_with_assignee(client: TestClient, team):
    r = client.post(
        team["url"],
        json={
            "title": "Write report",
            "description": "Sections 1-3",
            "deadline": "2026-11-01",
            "assignee_id": team["member_id"],
        },
        headers=team["owner"],
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["title"] == "Write report"
    assert body["description"] == "Sections 1-3"
    assert body["deadline"] == "2026-11-01"
    assert body["assignee_id"] == team["member_id"]
    assert body["status"] == "todo"
    assert body["created_by"] == team["owner_id"]
    assert body["team_id"] == team["id"]
    assert body["created_at"] and body["updated_at"]


def test_create_task_minimal_defaults(client: TestClient, team):
    r = client.post(team["url"], json={"title": "Bare"}, headers=team["member"])
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "todo"
    assert body["description"] is None
    assert body["deadline"] is None
    assert body["assignee_id"] is None
    assert body["created_by"] == team["member_id"]


def test_create_task_invalid_assignee_400(client: TestClient, team):
    r = client.post(team["url"], json={"title": "X", "assignee_id": team["stranger_id"]}, headers=team["owner"])
    assert r.status_code == 400
    assert r.json()["detail"] == "Assignee must be a member of this team"

    r = client.post(team["url"], json={"title": "X", "assignee_id": 9999}, headers=team["owner"])
    assert r.status_code == 400


def test_create_task_title_required(client: TestClient, team):
    assert client.post(team["url"], json={}, headers=team["owner"]).status_code == 422
    assert client.post(team["url"], json={"title": ""}, headers=team["owner"]).status_code == 422


def test_create_task_invalid_deadline_422(client: TestClient, team):
    r = client.post(team["url"], json={"title": "X", "deadline": "tomorrow"}, headers=team["owner"])
    assert r.status_code == 422


def test_create_task_non_member_403(client: TestClient, team):
    r = client.post(team["url"], json={"title": "X"}, headers=team["stranger"])
    assert r.status_code == 403


def test_create_task_unknown_team_404(client: TestClient, team):
    assert client.post("/teams/999/tasks", json={"title": "X"}, headers=team["owner"]).status_code == 404


def test_create_task_requires_auth(client: TestClient, team):
    assert client.post(team["url"], json={"title": "X"}).status_code == 401


# --- list ---------------------------------------------------------------------


def test_list_tasks_with_filters(client: TestClient, team):
    def mk(title, **kw):
        return client.post(team["url"], json={"title": title, **kw}, headers=team["owner"]).json()["id"]

    t1 = mk("one", assignee_id=team["member_id"])
    t2 = mk("two", assignee_id=team["owner_id"])
    t3 = mk("three")
    client.patch(f"{team['url']}/{t2}/status", json={"status": "done"}, headers=team["owner"])

    all_ids = [t["id"] for t in client.get(team["url"], headers=team["member"]).json()]
    assert all_ids == [t1, t2, t3]

    todo = client.get(team["url"], params={"status": "todo"}, headers=team["owner"]).json()
    assert [t["id"] for t in todo] == [t1, t3]

    done = client.get(team["url"], params={"status": "done"}, headers=team["owner"]).json()
    assert [t["id"] for t in done] == [t2]

    mine = client.get(team["url"], params={"assignee_id": team["member_id"]}, headers=team["owner"]).json()
    assert [t["id"] for t in mine] == [t1]

    both = client.get(
        team["url"], params={"status": "todo", "assignee_id": team["owner_id"]}, headers=team["owner"]
    ).json()
    assert both == []


def test_list_tasks_invalid_status_filter_422(client: TestClient, team):
    assert client.get(team["url"], params={"status": "blocked"}, headers=team["owner"]).status_code == 422


def test_list_tasks_non_member_403(client: TestClient, team):
    assert client.get(team["url"], headers=team["stranger"]).status_code == 403


def test_tasks_are_scoped_to_team(client: TestClient, team):
    other = client.post("/teams", json={"name": "Beta"}, headers=team["owner"]).json()
    client.post(team["url"], json={"title": "in alpha"}, headers=team["owner"])
    assert client.get(f"/teams/{other['id']}/tasks", headers=team["owner"]).json() == []


# --- status (US-3) --------------------------------------------------------------


def test_status_flow_todo_in_progress_done(client: TestClient, team):
    task = client.post(team["url"], json={"title": "Flow"}, headers=team["owner"]).json()
    url = f"{team['url']}/{task['id']}/status"
    assert task["status"] == "todo"
    t0 = datetime.fromisoformat(task["updated_at"])

    r = client.patch(url, json={"status": "in_progress"}, headers=team["member"])
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"
    t1 = datetime.fromisoformat(r.json()["updated_at"])
    assert t1 >= t0

    r = client.patch(url, json={"status": "done"}, headers=team["member"])
    assert r.status_code == 200
    assert r.json()["status"] == "done"
    t2 = datetime.fromisoformat(r.json()["updated_at"])
    assert t2 >= t1

    # persisted
    assert client.get(team["url"], headers=team["owner"]).json()[0]["status"] == "done"


def test_status_can_move_backwards(client: TestClient, team):
    task = client.post(team["url"], json={"title": "Back"}, headers=team["owner"]).json()
    url = f"{team['url']}/{task['id']}/status"
    client.patch(url, json={"status": "done"}, headers=team["owner"])
    r = client.patch(url, json={"status": "todo"}, headers=team["owner"])
    assert r.json()["status"] == "todo"


def test_status_invalid_value_422(client: TestClient, team):
    task = client.post(team["url"], json={"title": "X"}, headers=team["owner"]).json()
    r = client.patch(f"{team['url']}/{task['id']}/status", json={"status": "blocked"}, headers=team["owner"])
    assert r.status_code == 422
    r = client.patch(f"{team['url']}/{task['id']}/status", json={}, headers=team["owner"])
    assert r.status_code == 422


def test_status_non_member_403(client: TestClient, team):
    task = client.post(team["url"], json={"title": "X"}, headers=team["owner"]).json()
    r = client.patch(f"{team['url']}/{task['id']}/status", json={"status": "done"}, headers=team["stranger"])
    assert r.status_code == 403


def test_status_unknown_task_404(client: TestClient, team):
    r = client.patch(f"{team['url']}/999/status", json={"status": "done"}, headers=team["owner"])
    assert r.status_code == 404


# --- edit ---------------------------------------------------------------------


def test_patch_task_fields(client: TestClient, team):
    task = client.post(team["url"], json={"title": "Old"}, headers=team["owner"]).json()
    r = client.patch(
        f"{team['url']}/{task['id']}",
        json={"title": "New", "description": "d", "deadline": "2026-12-24", "assignee_id": team["member_id"]},
        headers=team["member"],
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["title"] == "New"
    assert body["description"] == "d"
    assert body["deadline"] == "2026-12-24"
    assert body["assignee_id"] == team["member_id"]
    assert body["status"] == "todo"  # status untouched by generic PATCH


def test_patch_task_partial_and_clear(client: TestClient, team):
    task = client.post(
        team["url"],
        json={"title": "T", "description": "keep", "deadline": "2026-12-24", "assignee_id": team["member_id"]},
        headers=team["owner"],
    ).json()
    r = client.patch(f"{team['url']}/{task['id']}", json={"assignee_id": None, "deadline": None}, headers=team["owner"])
    assert r.status_code == 200
    body = r.json()
    assert body["assignee_id"] is None
    assert body["deadline"] is None
    assert body["description"] == "keep"  # unsent fields untouched
    assert body["title"] == "T"


def test_patch_task_invalid_assignee_400(client: TestClient, team):
    task = client.post(team["url"], json={"title": "T"}, headers=team["owner"]).json()
    r = client.patch(f"{team['url']}/{task['id']}", json={"assignee_id": team["stranger_id"]}, headers=team["owner"])
    assert r.status_code == 400


def test_patch_task_empty_body_400(client: TestClient, team):
    task = client.post(team["url"], json={"title": "T"}, headers=team["owner"]).json()
    r = client.patch(f"{team['url']}/{task['id']}", json={}, headers=team["owner"])
    assert r.status_code == 400


def test_patch_task_from_other_team_404(client: TestClient, team):
    other = client.post("/teams", json={"name": "Beta"}, headers=team["owner"]).json()
    task = client.post(team["url"], json={"title": "T"}, headers=team["owner"]).json()
    r = client.patch(f"/teams/{other['id']}/tasks/{task['id']}", json={"title": "x"}, headers=team["owner"])
    assert r.status_code == 404


# --- delete -------------------------------------------------------------------


def test_delete_by_creator(client: TestClient, team):
    task = client.post(team["url"], json={"title": "T"}, headers=team["member"]).json()
    r = client.delete(f"{team['url']}/{task['id']}", headers=team["member"])
    assert r.status_code == 204
    assert client.get(team["url"], headers=team["member"]).json() == []


def test_delete_by_team_owner(client: TestClient, team):
    task = client.post(team["url"], json={"title": "T"}, headers=team["member"]).json()
    assert client.delete(f"{team['url']}/{task['id']}", headers=team["owner"]).status_code == 204


def test_delete_by_other_member_403(client: TestClient, team):
    task = client.post(team["url"], json={"title": "T"}, headers=team["owner"]).json()
    r = client.delete(f"{team['url']}/{task['id']}", headers=team["member"])
    assert r.status_code == 403
    assert client.get(team["url"], headers=team["member"]).json()[0]["id"] == task["id"]


def test_delete_non_member_403(client: TestClient, team):
    task = client.post(team["url"], json={"title": "T"}, headers=team["owner"]).json()
    assert client.delete(f"{team['url']}/{task['id']}", headers=team["stranger"]).status_code == 403


def test_delete_unknown_task_404(client: TestClient, team):
    assert client.delete(f"{team['url']}/999", headers=team["owner"]).status_code == 404
