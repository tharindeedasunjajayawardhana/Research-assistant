from tests.helpers import make_pdf

LONG_PAGE = " ".join(
    f"Sentence {i} describes a different part of the proposed method in detail." for i in range(45)
)
SHORT_PAGE = "A short second page that still has enough text to become one chunk."


def upload(client, data):
    return client.post("/papers", files={"file": ("paper.pdf", data, "application/pdf")})


def test_chunks_are_page_aware_and_offsets_match_the_page_text(client):
    paper_id = upload(client, make_pdf([LONG_PAGE, SHORT_PAGE])).json()["id"]
    chunks = client.get(f"/papers/{paper_id}/chunks").json()

    assert {c["page_no"] for c in chunks} == {1, 2}
    page1 = [c for c in chunks if c["page_no"] == 1]
    page2 = [c for c in chunks if c["page_no"] == 2]
    assert len(page1) >= 2 and len(page2) == 1
    assert [c["chunk_index"] for c in page1] == list(range(len(page1)))

    for page_no in (1, 2):
        page_text = client.get(f"/papers/{paper_id}/pages/{page_no}").json()["text"]
        for c in (c for c in chunks if c["page_no"] == page_no):
            assert page_text[c["char_start"] : c["char_end"]] == c["text"]
            assert c["char_count"] == len(c["text"])


def test_chunks_can_be_filtered_by_page(client):
    paper_id = upload(client, make_pdf([LONG_PAGE, SHORT_PAGE])).json()["id"]
    chunks = client.get(f"/papers/{paper_id}/chunks", params={"page": 2}).json()
    assert len(chunks) == 1 and chunks[0]["page_no"] == 2


def test_scanned_page_has_no_chunks(client):
    paper_id = upload(client, make_pdf([SHORT_PAGE, None])).json()["id"]
    chunks = client.get(f"/papers/{paper_id}/chunks").json()
    assert {c["page_no"] for c in chunks} == {1}


def test_reprocess_rebuilds_chunks(client):
    paper_id = upload(client, make_pdf([LONG_PAGE, SHORT_PAGE])).json()["id"]
    before = client.get(f"/papers/{paper_id}/chunks").json()

    response = client.post(f"/papers/{paper_id}/reprocess")
    assert response.status_code == 202

    assert client.get(f"/papers/{paper_id}").json()["status"] == "ready"
    after = client.get(f"/papers/{paper_id}/chunks").json()
    assert [c["text"] for c in after] == [c["text"] for c in before]


def test_unknown_paper_returns_404(client):
    assert client.get("/papers/nope/chunks").status_code == 404
    assert client.post("/papers/nope/reprocess").status_code == 404
