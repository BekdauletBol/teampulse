from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import auth, tasks, teams
from app.schemas.task import INVALID_COLOR_ERROR

app = FastAPI(title=settings.app_name, version="0.1.0")

# The frontend calls the API cross-origin when deployed separately (VITE_API_BASE).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.exception_handler(RequestValidationError)
async def _validation_errors(request: Request, exc: RequestValidationError):
    """An unknown task colour is a bad value, not a malformed request: answer 400.
    Every other validation failure keeps FastAPI's default 422."""
    errors = exc.errors()
    if errors and all(e.get("type") == INVALID_COLOR_ERROR for e in errors):
        return JSONResponse(status_code=400, content={"detail": jsonable_encoder(errors)})
    return await request_validation_exception_handler(request, exc)


app.include_router(auth.router)
app.include_router(teams.router)
app.include_router(tasks.router)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
