import json

import pytest

from app.models import Paper, PaperChunk, PaperPage
from app.services import rag, retrieval
from app.services.llm import LlmError

DIMS = 384
PAGES = {
    1: "Title page. This paper presents a new attention based model for translation.",
    2: "The method stacks six encoder layers that use multi head self attention.",
    3: "The model reaches 28.4 BLEU on the English to German benchmark.",
}


def vec(i: int) -> list[float]:
    return [1.0 if j == i else 0.0 for j in range(DIMS)]


def seed_paper(client, paper_id: str = "seedpaper", status: str = "ready") -> str:
    factory = client.app.state.session_factory
    with factory() as db:
        db.add(
            Paper(
                id=paper_id, filename="seed.pdf", stored_path="none", sha256="0" * 64,
                size_bytes=1, page_count=3, language="en", status=status, low_text_pages=[],
            )
        )
        db.flush()
        for number, text in PAGES.items():
            db.add(
                PaperPage(
                    paper_id=paper_id, page_no=number, text=text, char_count=len(text),
                    is_low_text=False, extraction_method="pymupdf_text",
                )
            )
            db.add(
                PaperChunk(
                    paper_id=paper_id, page_no=number, chunk_index=0, char_start=0,
                    char_end=len(text), char_count=len(text), text=text, embedding=vec(number),
                )
            )
        db.commit()
    return paper_id


@pytest.fixture(autouse=True)
def fake_query_embedding(monkeypatch):
    """Map query words to the seeded one-hot vectors, so no real model is needed."""

    def fake(query: str) -> list[float]:
        q = query.lower()
        if "unrelated" in q:
            return vec(200)
        if "method" in q or "architecture" in q or "layers" in q:
            return vec(2)
        if "result" in q or "bleu" in q:
            return vec(3)
        return vec(1)

    monkeypatch.setattr(retrieval, "embed_query", fake)


def fake_llm(monkeypatch, reply):
    calls = []

    def fake(settings, system, prompt, json_mode=False):
        calls.append({"system": system, "prompt": prompt, "json_mode": json_mode})
        if isinstance(reply, Exception):
            raise reply
        return reply

    monkeypatch.setattr(rag, "generate", fake)
    return calls


SUMMARY_JSON = json.dumps(
    {
        "title": "Seed Paper",
        "authors": ["A. Author"],
        "abstract": {"text": "A new model.", "sources": [1, 99]},
        "problem_statement": {"text": "A problem.", "sources": [1]},
        "methodology": {"text": "Encoder layers.", "sources": [2]},
        "key_results": {"text": "28.4 BLEU.", "sources": [3, 2]},
        "conclusion": {"text": "It works.", "sources": []},
    }
)


def test_chat_answers_with_sources_from_retrieved_pages_only(client, monkeypatch):
    paper_id = seed_paper(client)
    calls = fake_llm(
        monkeypatch, "It stacks six encoder layers [Page 2]. It is also evaluated [Page 3]."
    )

    response = client.post(f"/papers/{paper_id}/chat", json={"question": "How does the method work?"})

    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "assistant"
    assert "[Page 2]" in body["content"]
    assert "[Page 3]" not in body["content"]
    assert [s["page"] for s in body["sources"]] == [2]
    assert body["sources"][0]["snippet"].startswith("The method")
    assert "BLEU" not in calls[0]["prompt"]


def test_chat_skips_the_llm_when_nothing_is_relevant(client, monkeypatch):
    paper_id = seed_paper(client)
    calls = fake_llm(monkeypatch, "should never be used")

    response = client.post(f"/papers/{paper_id}/chat", json={"question": "unrelated cooking question"})

    assert response.status_code == 200
    assert response.json()["content"] == rag.NO_ANSWER
    assert response.json()["sources"] == []
    assert calls == []


def test_chat_rejects_bad_requests(client, monkeypatch):
    fake_llm(monkeypatch, "x")
    paper_id = seed_paper(client)
    processing_id = seed_paper(client, paper_id="busypaper", status="processing")

    assert client.post(f"/papers/{paper_id}/chat", json={"question": ""}).status_code == 422
    assert client.post(f"/papers/{paper_id}/chat", json={"question": "hi", "lang": "xx"}).status_code == 422
    assert client.post("/papers/nope/chat", json={"question": "hi"}).status_code == 404
    assert client.post(f"/papers/{processing_id}/chat", json={"question": "hi"}).status_code == 409


def test_chat_reports_missing_api_key(client):
    paper_id = seed_paper(client)
    response = client.post(f"/papers/{paper_id}/chat", json={"question": "How does the method work?"})
    assert response.status_code == 503
    assert "GEMINI_API_KEY" in response.json()["detail"]


def test_summary_has_all_sections_and_drops_unsupported_pages(client, monkeypatch):
    paper_id = seed_paper(client)
    calls = fake_llm(monkeypatch, SUMMARY_JSON)

    response = client.get(f"/papers/{paper_id}/summary", params={"lang": "auto"})

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Seed Paper"
    assert body["authors"] == ["A. Author"]
    assert body["abstract"]["sources"] == [1]
    assert body["key_results"]["sources"] == [2, 3]
    assert body["conclusion"]["sources"] == []
    assert calls[0]["json_mode"] is True


def test_summary_is_cached_per_language(client, monkeypatch):
    paper_id = seed_paper(client)
    calls = fake_llm(monkeypatch, SUMMARY_JSON)

    first = client.get(f"/papers/{paper_id}/summary", params={"lang": "en"}).json()
    second = client.get(f"/papers/{paper_id}/summary", params={"lang": "auto"}).json()
    assert first == second
    assert len(calls) == 1

    client.get(f"/papers/{paper_id}/summary", params={"lang": "ja"})
    assert len(calls) == 2
    assert "Japanese" in calls[1]["system"]


def test_summary_reports_ai_failures_clearly(client, monkeypatch):
    paper_id = seed_paper(client)
    fake_llm(monkeypatch, LlmError("The AI service is busy right now."))
    response = client.get(f"/papers/{paper_id}/summary")
    assert response.status_code == 503
    assert response.json()["detail"] == "The AI service is busy right now."


def test_summary_rejects_malformed_model_output(client, monkeypatch):
    paper_id = seed_paper(client)
    fake_llm(monkeypatch, "this is not json")
    assert client.get(f"/papers/{paper_id}/summary").status_code == 503


def test_summary_requires_a_ready_paper(client, monkeypatch):
    fake_llm(monkeypatch, SUMMARY_JSON)
    processing_id = seed_paper(client, paper_id="busypaper", status="processing")
    assert client.get(f"/papers/{processing_id}/summary").status_code == 409
    assert client.get("/papers/nope/summary").status_code == 404
