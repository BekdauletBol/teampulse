from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET = "dev-only-insecure-secret-change-me"


class Settings(BaseSettings):
    """
    All values come from the environment (or a local .env). Render sets DATABASE_URL,
    SECRET_KEY, FRONTEND_URL and APP_ENV; locally the defaults give a SQLite dev setup.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "TeamPulse"
    app_env: str = Field(default="development", validation_alias=AliasChoices("APP_ENV", "ENV"))

    database_url: str = "sqlite:///./teampulse.db"

    # SECRET_KEY is the canonical name; JWT_SECRET still works for older configs.
    secret_key: str = Field(default=DEV_SECRET, validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET"))
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    frontend_url: str = "http://localhost:5173"

    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() in {"development", "dev", "local", "test"}

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def cors_origins(self) -> list[str]:
        origins = [self.frontend_url.rstrip("/"), "http://localhost:5173", "http://127.0.0.1:5173"]
        return list(dict.fromkeys(o for o in origins if o))

    @field_validator("database_url")
    @classmethod
    def _normalize_database_url(cls, v: str) -> str:
        # Render/Heroku hand out postgres://; SQLAlchemy 2 only accepts postgresql://
        if v.startswith("postgres://"):
            v = "postgresql://" + v[len("postgres://") :]
        return v

    @model_validator(mode="after")
    def _require_secret_outside_dev(self) -> "Settings":
        if not self.is_dev and (not self.secret_key.strip() or self.secret_key == DEV_SECRET):
            raise RuntimeError(
                "SECRET_KEY is not set. Refusing to start with the development secret when "
                f"APP_ENV={self.app_env!r}. Generate one with: "
                'python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        return self


settings = Settings()
