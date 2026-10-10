import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .config import get_settings
from .database import SessionLocal
from .routers import ai, papers

settings = get_settings()

app = FastAPI(title="Paper Insight API", version="0.4.0")
app.state.session_factory = SessionLocal  # tests replace this

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "X-Request-ID"],
)
app.include_router(papers.router)
app.include_router(ai.router)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response


@app.get("/health", tags=["health"])
def health(request: Request):
    try:
        with request.app.state.session_factory() as db:
            db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse({"status": "database unavailable"}, status_code=503)
    return {"status": "ok"}
