import json
import pytest

from app.models import Paper, PaperChunk, PaperPage
from app.services import concerns, comparison, retrieval

DIMS = 384
PAGES = {
    1: "Title page. This study investigates the accuracy of LLM evaluations on synthetic benchmarks.",
    2: "The experimental method tested 50 prompts across 2 models without standard baselines.",
    3: "The authors conclude their approach achieves 99% accuracy, though sample size is small.",
}


def vec(i: int) -> list[float]:
    return [1.0 if j == i else 0.0 for j in range(DIMS)]


def seed(client, paper_id: str, filename: str = "seed.pdf") -> str:
    factory = client.app.state.session_factory
    with factory() as db:
        db.add(
            Paper(
                id=paper_id,
                filename=filename,
                stored_path="none",
                sha256=f"hash_{paper_id}" + "0" * 50,
                size_bytes=100,
                page_count=3,
                language="en",
                status="ready",
                low_text_pages=[],
            )
        )
        db.flush()
        for number, text in PAGES.items():
            db.add(
                PaperPage(
                    paper_id=paper_id,
                    page_no=number,
                    text=text,
                    char_count=len(text),
                    is_low_text=False,
                    extraction_method="pymupdf_text",
                )
            )
            db.add(
                PaperChunk(
                    paper_id=paper_id,
                    page_no=number,
                    chunk_index=0,
                    char_start=0,
                    char_end=len(text),
                    char_count=len(text),
                    text=text,
                    embedding=vec(number),
                )
            )
        db.commit()
    return paper_id


@pytest.fixture(autouse=True)
def fake_query_embedding(monkeypatch):
    monkeypatch.setattr(retrieval, "embed_query", lambda q: vec(2))


CONCERNS_JSON = json.dumps(
    {
        "summary": "The paper has a small sample size and lacks baseline comparisons.",
        "concerns": [
            {
                "title": "Small Sample Size",
                "category": "sample_representation",
                "description": "Evaluation only tested 50 prompts.",
                "why_it_matters": "Results may not generalize across diverse benchmarks.",
                "status": "potential_concern",
                "acknowledged_by_authors": True,
                "page": 2,
                "snippet": "The experimental method tested 50 prompts across 2 models",
                "confidence": "high",
                "suggested_investigation": "Test across a broader test set with standard baselines.",
            },
            {
                "title": "Missing Standard Baselines",
                "category": "missing_baselines",
                "description": "The authors did not include established baseline models.",
                "why_it_matters": "Difficult to establish whether gains are statistically significant.",
                "status": "evidence_gap",
                "acknowledged_by_authors": False,
                "page": 2,
                "snippet": "without standard baselines",
                "confidence": "moderate",
                "suggested_investigation": "Compare performance against GPT-4 or Claude baselines.",
            },
        ],
    }
)


def test_research_concerns_endpoint_and_caching(client, monkeypatch):
    paper_id = seed(client, "concerns_paper")

    def fake_generate(settings, system, prompt, json_mode=False):
        return CONCERNS_JSON

    monkeypatch.setattr(concerns, "generate", fake_generate)

    res = client.get(f"/papers/{paper_id}/concerns")
    assert res.status_code == 200
    body = res.json()
    assert body["paper_id"] == paper_id
    assert body["total_concerns"] == 2
    assert body["author_acknowledged_count"] == 1
    assert body["ai_identified_count"] == 1
    assert len(body["concerns"]) == 2
    assert body["concerns"][0]["title"] == "Small Sample Size"
    assert body["concerns"][0]["page"] == 2
    assert "disclaimer" in body

    # Second call uses cached result (monkeypatch raises error if called)
    def broken_generate(*args, **kwargs):
        raise RuntimeError("Should use cache")

    monkeypatch.setattr(concerns, "generate", broken_generate)
    cached_res = client.get(f"/papers/{paper_id}/concerns")
    assert cached_res.status_code == 200
    assert cached_res.json()["total_concerns"] == 2


COMPARE_JSON = json.dumps(
    {
        "summary": "Both papers evaluate LLM evaluation metrics.",
        "profiles": [
            {
                "paper_id": "paper_1",
                "title": "Paper 1",
                "objectives": "Study evaluation prompts",
                "methodology": "Synthetic prompting",
                "datasets": "50 prompts",
                "findings": "High accuracy",
                "limitations": "Small sample",
            },
            {
                "paper_id": "paper_2",
                "title": "Paper 2",
                "objectives": "Benchmark models",
                "methodology": "Human evaluation",
                "datasets": "100 prompts",
                "findings": "Moderate accuracy",
                "limitations": "Subjective scoring",
            },
        ],
        "agreements": ["Both agree current metrics are noisy."],
        "disagreements": ["Paper 1 reports higher accuracy than Paper 2."],
        "evidence_gaps": ["Neither paper tested open source LLMs."],
    }
)


def test_multi_paper_comparison(client, monkeypatch):
    p1 = seed(client, "paper_1", "paper1.pdf")
    p2 = seed(client, "paper_2", "paper2.pdf")

    def fake_generate(settings, system, prompt, json_mode=False):
        return COMPARE_JSON

    monkeypatch.setattr(comparison, "generate", fake_generate)

    res = client.post(
        "/papers/compare",
        json={"paper_ids": [p1, p2], "focus_query": "evaluation accuracy"},
    )
    assert res.status_code == 200
    body = res.json()
    assert len(body["paper_ids"]) == 2
    assert len(body["profiles"]) == 2
    assert len(body["synthesis"]["agreements"]) == 1
    assert len(body["synthesis"]["disagreements"]) == 1


def test_compare_rejects_fewer_than_two_papers(client):
    res = client.post("/papers/compare", json={"paper_ids": ["single_paper"]})
    assert res.status_code == 422


def test_compare_rejects_unready_or_nonexistent_papers(client):
    res = client.post(
        "/papers/compare", json={"paper_ids": ["nonexistent_1", "nonexistent_2"]}
    )
    assert res.status_code == 400
    assert "Select at least two ready papers" in res.json()["detail"]

