from pathlib import Path

from tests.helpers import make_pdf

TEXT1 = "This research paper studies neural networks for language translation."
TEXT2 = "The experiments show strong results on several translation benchmarks."


def upload(client, data: bytes, name: str = "paper.pdf"):
    return client.post("/papers", files={"file": (name, data, "application/pdf")})


def test_valid_pdf_is_uploaded_processed_and_stored(client, settings):
    response = upload(client, make_pdf([TEXT1, TEXT2]))
    assert response.status_code == 201
    body = response.json()
    assert body["page_count"] == 2
    assert body["filename"] == "paper.pdf"

    # Background extraction has finished by the time the test client returns.
    paper = client.get(f"/papers/{body['id']}").json()
    assert paper["status"] == "ready"
    assert paper["language"] == "en"
    assert paper["low_text_pages"] == []
    assert (Path(settings.storage_dir) / f"{body['id']}.pdf").exists()


def test_page_text_is_stored_per_page(client):
    paper_id = upload(client, make_pdf([TEXT1, TEXT2])).json()["id"]

    pages = client.get(f"/papers/{paper_id}/pages").json()
    assert [p["page_no"] for p in pages] == [1, 2]
    assert pages[0]["extraction_method"] == "pymupdf_text"

    page2 = client.get(f"/papers/{paper_id}/pages/2").json()
    assert "experiments" in page2["text"]
    assert "neural networks" not in page2["text"]


def test_scanned_pages_are_reported(client):
    paper_id = upload(client, make_pdf([TEXT1, None])).json()["id"]
    paper = client.get(f"/papers/{paper_id}").json()
    assert paper["status"] == "ready"
    assert paper["low_text_pages"] == [2]


def test_pdf_without_any_text_fails_with_a_clear_message(client):
    paper_id = upload(client, make_pdf([""])).json()["id"]
    paper = client.get(f"/papers/{paper_id}").json()
    assert paper["status"] == "failed"
    assert "no readable text" in paper["error_message"]


def test_rejects_non_pdf(client):
    response = upload(client, b"just some plain text, not a pdf", "notes.txt")
    assert response.status_code == 415
    assert "PDF" in response.json()["detail"]


def test_rejects_empty_file(client):
    assert upload(client, b"").status_code == 400


def test_rejects_oversized_file(client, settings):
    settings.max_upload_mb = 1
    response = upload(client, b"%PDF-" + b"0" * (1024 * 1024 + 10))
    assert response.status_code == 413


def test_rejects_password_protected_pdf(client):
    response = upload(client, make_pdf(["secret"], password="pw"))
    assert response.status_code == 422
    assert "password" in response.json()["detail"].lower()


def test_rejects_corrupted_pdf(client):
    response = upload(client, b"%PDF-1.4 this is not really a pdf")
    assert response.status_code == 422


def test_unknown_paper_and_page_return_404(client):
    assert client.get("/papers/doesnotexist").status_code == 404
    assert client.get("/papers/doesnotexist/pages").status_code == 404
    paper_id = upload(client, make_pdf([TEXT1])).json()["id"]
    assert client.get(f"/papers/{paper_id}/pages/99").status_code == 404


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}
