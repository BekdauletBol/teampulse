from fastapi import FastAPI

from app.config import settings
from app.routers import auth, tasks, teams

app = FastAPI(title=settings.app_name, version="0.1.0")

app.include_router(auth.router)
app.include_router(teams.router)
app.include_router(tasks.router)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
