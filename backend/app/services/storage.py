from pathlib import Path


def save_pdf(storage_dir: str, paper_id: str, data: bytes) -> str:
    """Store the original PDF on disk under the paper id (never under the user's filename)."""
    path = Path(storage_dir) / f"{paper_id}.pdf"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return str(path)


def delete_pdf(path: str) -> None:
    Path(path).unlink(missing_ok=True)


def delete_stored_pdf(stored_path: str | None, storage_dir: str) -> None:
    """Delete a paper PDF only if it lives inside the configured storage directory."""
    if not stored_path:
        return
    storage_root = Path(storage_dir).resolve()
    target = Path(stored_path)
    try:
        resolved = target.resolve()
    except OSError:
        return
    if resolved.is_relative_to(storage_root):
        resolved.unlink(missing_ok=True)


def clean_filename(name: str | None) -> str:
    base = (name or "paper.pdf").replace("\\", "/").split("/")[-1].strip()
    return (base or "paper.pdf")[:255]
