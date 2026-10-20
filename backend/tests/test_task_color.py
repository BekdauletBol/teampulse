import pytest
from fastapi.testclient import TestClient

from app.schemas.task import TASK_COLORS


@pytest.fixture
def ctx(client: TestClient) -> dict:
    r = client.post("/auth/register", json={"email": "c@example.com", "password": "password123", "name": "C"})
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    team = client.post("/teams", json={"name": "Colors"}, headers=headers).json()
    return {"h": headers, "url": f"/teams/{team['id']}/tasks"}


def test_create_with_color(client: TestClient, ctx):
    r = client.post(ctx["url"], json={"title": "T", "color": "#4F7BFF"}, headers=ctx["h"])
    assert r.status_code == 201
    assert r.json()["color"] == "#4F7BFF"
    # also returned by the list endpoint
    assert client.get(ctx["url"], headers=ctx["h"]).json()[0]["color"] == "#4F7BFF"


def test_create_without_color_is_null(client: TestClient, ctx):
    r = client.post(ctx["url"], json={"title": "T"}, headers=ctx["h"])
    assert r.status_code == 201
    assert r.json()["color"] is None


def test_create_with_explicit_null(client: TestClient, ctx):
    r = client.post(ctx["url"], json={"title": "T", "color": None}, headers=ctx["h"])
    assert r.status_code == 201
    assert r.json()["color"] is None


@pytest.mark.parametrize("color", list(TASK_COLORS))
def test_every_palette_color_accepted(client: TestClient, ctx, color):
    r = client.post(ctx["url"], json={"title": "T", "color": color}, headers=ctx["h"])
    assert r.status_code == 201
    assert r.json()["color"] == color


def test_color_is_case_insensitive_and_stored_uppercase(client: TestClient, ctx):
    r = client.post(ctx["url"], json={"title": "T", "color": "#f472b6"}, headers=ctx["h"])
    assert r.status_code == 201
    assert r.json()["color"] == "#F472B6"


@pytest.mark.parametrize("bad", ["#000000", "#4F7BF", "4F7BFF", "blue", "", "#4F7BFF00", 123])
def test_invalid_color_on_create_400(client: TestClient, ctx, bad):
    r = client.post(ctx["url"], json={"title": "T", "color": bad}, headers=ctx["h"])
    assert r.status_code == 400, r.text
    assert "color must be null or one of" in r.json()["detail"][0]["msg"]
    assert client.get(ctx["url"], headers=ctx["h"]).json() == []


def test_other_validation_errors_stay_422(client: TestClient, ctx):
    # missing title is still a 422, even when the color is also bad
    assert client.post(ctx["url"], json={"color": "#4F7BFF"}, headers=ctx["h"]).status_code == 422
    assert client.post(ctx["url"], json={"color": "#000000"}, headers=ctx["h"]).status_code == 422


def test_patch_color(client: TestClient, ctx):
    task = client.post(ctx["url"], json={"title": "T", "color": "#4F7BFF"}, headers=ctx["h"]).json()
    url = f"{ctx['url']}/{task['id']}"

    r = client.patch(url, json={"color": "#34D399"}, headers=ctx["h"])
    assert r.status_code == 200
    assert r.json()["color"] == "#34D399"
    assert r.json()["title"] == "T"  # untouched


def test_patch_color_to_null_clears_it(client: TestClient, ctx):
    task = client.post(ctx["url"], json={"title": "T", "color": "#A78BFA"}, headers=ctx["h"]).json()
    r = client.patch(f"{ctx['url']}/{task['id']}", json={"color": None}, headers=ctx["h"])
    assert r.status_code == 200
    assert r.json()["color"] is None


def test_patch_other_field_keeps_color(client: TestClient, ctx):
    task = client.post(ctx["url"], json={"title": "T", "color": "#FB923C"}, headers=ctx["h"]).json()
    r = client.patch(f"{ctx['url']}/{task['id']}", json={"title": "renamed"}, headers=ctx["h"])
    assert r.json()["color"] == "#FB923C"


def test_patch_invalid_color_400(client: TestClient, ctx):
    task = client.post(ctx["url"], json={"title": "T", "color": "#F87171"}, headers=ctx["h"]).json()
    url = f"{ctx['url']}/{task['id']}"
    r = client.patch(url, json={"color": "#123456"}, headers=ctx["h"])
    assert r.status_code == 400
    assert client.get(ctx["url"], headers=ctx["h"]).json()[0]["color"] == "#F87171"
