from datetime import timedelta

from fastapi.testclient import TestClient
from jose import jwt

from app.config import settings
from app.core.security import create_access_token

VALID = {"email": "ann@example.com", "password": "correct-horse", "name": "Ann"}


def register(client: TestClient, **overrides) -> dict:
    return client.post("/auth/register", json={**VALID, **overrides}).json()


# --- register -----------------------------------------------------------------


def test_register_returns_token(client: TestClient):
    r = client.post("/auth/register", json=VALID)
    assert r.status_code == 201
    body = r.json()
    assert body["token_type"] == "bearer"
    payload = jwt.decode(body["access_token"], settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    assert payload["sub"] == "1"
    assert "exp" in payload


def test_register_duplicate_email_409(client: TestClient):
    assert client.post("/auth/register", json=VALID).status_code == 201
    r = client.post("/auth/register", json={**VALID, "name": "Other"})
    assert r.status_code == 409
    assert r.json()["detail"] == "Email already registered"


def test_register_email_is_case_insensitive(client: TestClient):
    client.post("/auth/register", json=VALID)
    r = client.post("/auth/register", json={**VALID, "email": "ANN@Example.com"})
    assert r.status_code == 409


def test_register_invalid_email_400_family(client: TestClient):
    r = client.post("/auth/register", json={**VALID, "email": "not-an-email"})
    assert r.status_code == 422


def test_register_short_password_rejected(client: TestClient):
    r = client.post("/auth/register", json={**VALID, "password": "short"})
    assert r.status_code == 422


def test_register_empty_name_rejected(client: TestClient):
    r = client.post("/auth/register", json={**VALID, "name": ""})
    assert r.status_code == 422


def test_password_is_hashed_not_stored_plain(client: TestClient, db):
    from app.models import User

    client.post("/auth/register", json=VALID)
    user = db.query(User).one()
    assert user.password_hash != VALID["password"]
    assert user.password_hash.startswith("$2")


# --- login --------------------------------------------------------------------


def test_login_success(client: TestClient):
    client.post("/auth/register", json=VALID)
    r = client.post("/auth/login", json={"email": VALID["email"], "password": VALID["password"]})
    assert r.status_code == 200
    assert r.json()["token_type"] == "bearer"
    assert r.json()["access_token"]


def test_login_wrong_password_401(client: TestClient):
    client.post("/auth/register", json=VALID)
    r = client.post("/auth/login", json={"email": VALID["email"], "password": "wrong-password"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid email or password"
    assert r.headers["WWW-Authenticate"] == "Bearer"


def test_login_unknown_email_401(client: TestClient):
    r = client.post("/auth/login", json={"email": "nobody@example.com", "password": "whatever1"})
    assert r.status_code == 401


def test_login_email_case_insensitive(client: TestClient):
    client.post("/auth/register", json=VALID)
    r = client.post("/auth/login", json={"email": "Ann@EXAMPLE.com", "password": VALID["password"]})
    assert r.status_code == 200


# --- me -----------------------------------------------------------------------


def test_me_with_valid_token(client: TestClient):
    token = register(client)["access_token"]
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == VALID["email"]
    assert body["name"] == VALID["name"]
    assert body["id"] == 1
    assert "created_at" in body
    assert "password_hash" not in body


def test_me_without_token_401(client: TestClient):
    r = client.get("/auth/me")
    assert r.status_code == 401
    assert r.headers["WWW-Authenticate"] == "Bearer"


def test_me_with_garbage_token_401(client: TestClient):
    r = client.get("/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert r.status_code == 401


def test_me_with_wrong_secret_401(client: TestClient):
    register(client)
    forged = jwt.encode({"sub": "1"}, "another-secret", algorithm=settings.jwt_algorithm)
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert r.status_code == 401


def test_me_with_expired_token_401(client: TestClient):
    register(client)
    expired = create_access_token(1, expires_delta=timedelta(seconds=-1))
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401


def test_me_with_token_for_deleted_user_401(client: TestClient):
    token = create_access_token(999)
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_login_token_works_for_me(client: TestClient):
    client.post("/auth/register", json=VALID)
    token = client.post("/auth/login", json={"email": VALID["email"], "password": VALID["password"]}).json()[
        "access_token"
    ]
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == VALID["email"]
