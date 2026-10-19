import pytest

from app.config import DEV_SECRET, Settings


def make(**overrides) -> Settings:
    # _env_file=None: ignore any local .env so these tests are deterministic
    return Settings(_env_file=None, **overrides)


@pytest.mark.parametrize(
    "given, expected",
    [
        ("postgres://u:p@host:5432/db", "postgresql+psycopg2://u:p@host:5432/db"),
        ("postgresql://u:p@host/db", "postgresql+psycopg2://u:p@host/db"),
        ("postgresql+psycopg2://u:p@host/db", "postgresql+psycopg2://u:p@host/db"),
        ("sqlite:///./x.db", "sqlite:///./x.db"),
    ],
)
def test_database_url_is_normalized_to_psycopg2(given: str, expected: str):
    assert make(database_url=given, secret_key="x" * 32).database_url == expected


def test_dev_allows_default_secret():
    assert make(app_env="development").secret_key == DEV_SECRET


def test_production_requires_secret():
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        make(app_env="production")
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        make(app_env="production", secret_key=DEV_SECRET)
    assert make(app_env="production", secret_key="s" * 32).secret_key == "s" * 32


def test_cors_origins_include_frontend_and_localhost():
    origins = make(frontend_url="https://teampulse.example/").cors_origins
    assert origins[0] == "https://teampulse.example"
    assert "http://localhost:5173" in origins
    assert len(origins) == len(set(origins))
