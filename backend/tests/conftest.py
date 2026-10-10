import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401  (registers the tables)
from app.config import Settings, get_settings
from app.database import Base
from app.main import app
from app.services import processing


@pytest.fixture(autouse=True)
def stub_chunk_embeddings(monkeypatch):
    """Keep upload tests offline: processing still stores dummy 384-d vectors."""

    def fake_embed_texts(texts):
        return [[0.0] * 384 for _ in texts]

    monkeypatch.setattr(processing, "embed_texts", fake_embed_texts)


@pytest.fixture
def settings(tmp_path):
    return Settings(
        _env_file=None,
        storage_dir=str(tmp_path / "storage"),
        database_url="sqlite://",
        ocr_enabled=False,
        scholarly_enabled=False,
    )


@pytest.fixture
def client(settings):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    app.state.session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    app.dependency_overrides[get_settings] = lambda: settings
    yield TestClient(app)
    app.dependency_overrides.clear()
    engine.dispose()
