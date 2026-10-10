import pytest
from sqlalchemy import select

from app.models import Paper, PaperChunk
from tests.helpers import make_pdf

SHORT_PAGE = (
    "Machine learning models learn patterns from training data. "
    "Evaluation measures their performance on unseen examples."
)


def upload(client, data):
    return client.post(
        "/papers",
        files={"file": ("paper.pdf", data, "application/pdf")},
    )


@pytest.fixture
def ready_paper(client):
    """Upload a PDF and return its paper ID after background processing."""
    response = upload(client, make_pdf([SHORT_PAGE]))
    assert response.status_code == 201

    paper_id = response.json()["id"]
    assert client.get(f"/papers/{paper_id}").json()["status"] == "ready"
    return paper_id


def test_search_returns_ranked_chunks(client, ready_paper, monkeypatch):
    """Search returns the most similar chunks first."""
    import app.routers.papers as papers_router

    def fake_embed_query(query):
        assert query == "machine learning"
        return [1.0, 0.0, 0.0]

    monkeypatch.setattr(papers_router, "embed_query", fake_embed_query)

    # Add controlled embeddings so this test does not load the ML model.
    db = client.app.state.session_factory()
    try:
        chunks = db.scalars(
            select(PaperChunk)
            .where(PaperChunk.paper_id == ready_paper)
            .order_by(PaperChunk.chunk_index)
        ).all()

        assert chunks, "The uploaded PDF should produce at least one chunk."

        chunks[0].embedding = [1.0, 0.0, 0.0]
        if len(chunks) > 1:
            chunks[1].embedding = [0.0, 1.0, 0.0]

        db.commit()
    finally:
        db.close()

    response = client.get(
        f"/papers/{ready_paper}/search",
        params={"q": "machine learning"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["paper_id"] == ready_paper
    assert payload["query"] == "machine learning"
    assert payload["results"]
    assert payload["results"][0]["similarity"] == pytest.approx(1.0)
    assert all("text" in result for result in payload["results"])


def test_search_respects_limit(client, ready_paper, monkeypatch):
    import app.routers.papers as papers_router

    monkeypatch.setattr(
        papers_router,
        "embed_query",
        lambda query: [1.0, 0.0, 0.0],
    )

    db = client.app.state.session_factory()
    try:
        chunks = db.scalars(
            select(PaperChunk).where(PaperChunk.paper_id == ready_paper)
        ).all()

        for chunk in chunks:
            chunk.embedding = [1.0, 0.0, 0.0]

        db.commit()
    finally:
        db.close()

    response = client.get(
        f"/papers/{ready_paper}/search",
        params={"q": "machine learning", "limit": 1},
    )

    assert response.status_code == 200
    assert len(response.json()["results"]) <= 1


def test_search_unknown_paper_returns_404(client, monkeypatch):
    import app.routers.papers as papers_router

    monkeypatch.setattr(
        papers_router,
        "embed_query",
        lambda query: [1.0, 0.0, 0.0],
    )

    response = client.get(
        "/papers/does-not-exist/search",
        params={"q": "anything"},
    )

    assert response.status_code == 404


def test_search_rejects_paper_not_ready(client, monkeypatch):
    import app.routers.papers as papers_router

    monkeypatch.setattr(
        papers_router,
        "embed_query",
        lambda query: [1.0, 0.0, 0.0],
    )

    response = upload(client, make_pdf([SHORT_PAGE]))
    paper_id = response.json()["id"]

    db = client.app.state.session_factory()
    try:
        paper = db.get(Paper, paper_id)
        paper.status = "processing"
        db.commit()
    finally:
        db.close()

    response = client.get(
        f"/papers/{paper_id}/search",
        params={"q": "anything"},
    )

    assert response.status_code == 409


def test_search_rejects_blank_query(client, ready_paper):
    response = client.get(
        f"/papers/{ready_paper}/search",
        params={"q": "   "},
    )

    assert response.status_code == 422
