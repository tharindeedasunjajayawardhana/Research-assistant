from pathlib import Path

from tests.helpers import make_pdf

TEXT1 = "Quantum computing relies on qubits to achieve computational speedups."
TEXT2 = "Error mitigation techniques are essential for current NISQ devices."


def upload(client, data: bytes, name: str = "quantum.pdf"):
    return client.post("/papers", files={"file": (name, data, "application/pdf")})


def test_list_papers(client):
    pdf = make_pdf([TEXT1])
    res = upload(client, pdf, "paper_a.pdf")
    assert res.status_code == 201

    list_res = client.get("/papers")
    assert list_res.status_code == 200
    papers = list_res.json()
    assert isinstance(papers, list)
    assert any(p["filename"] == "paper_a.pdf" for p in papers)


def test_duplicate_upload_returns_existing_ready_paper(client):
    pdf = make_pdf([TEXT1, TEXT2])
    first = upload(client, pdf, "first.pdf").json()
    first_id = first["id"]

    # Second upload with identical bytes
    second = upload(client, pdf, "duplicate.pdf").json()
    assert second["id"] == first_id


def test_delete_paper_safely_removes_records_and_storage(client, settings):
    pdf = make_pdf([TEXT1, TEXT2])
    paper_id = upload(client, pdf, "to_delete.pdf").json()["id"]

    stored_file = Path(settings.storage_dir) / f"{paper_id}.pdf"
    assert stored_file.exists()

    # Create a note on the paper
    note_res = client.post(
        f"/papers/{paper_id}/notes",
        json={"page_no": 1, "body": "Important note to be deleted"},
    )
    assert note_res.status_code == 201

    # Delete paper
    del_res = client.delete(f"/papers/{paper_id}")
    assert del_res.status_code == 204

    # Verify paper and child resources return 404
    assert client.get(f"/papers/{paper_id}").status_code == 404
    assert client.get(f"/papers/{paper_id}/pages").status_code == 404
    assert client.get(f"/papers/{paper_id}/notes").status_code == 404

    # Verify storage file is removed
    assert not stored_file.exists()
