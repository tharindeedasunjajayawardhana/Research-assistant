import hashlib
import math
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..ai_schemas import CompareOut, CompareRequest
from ..config import Settings, get_settings
from ..deps import get_db
from ..models import Paper, PaperChunk, PaperNote, PaperPage
from ..schemas import (
    ChunkOut,
    NoteCreate,
    NoteOut,
    PageMeta,
    PageOut,
    PaperOut,
    SearchResponse,
    SearchResult,
)
from ..services.comparison import compare_multiple_papers
from ..services.embeddings import embed_query
from ..services.extraction import PdfError, inspect_pdf
from ..services.language import LANG_NAMES, detect_language_report, query_language_warning
from ..services.llm import LlmError
from ..services.processing import process_paper
from ..services.storage import clean_filename, delete_pdf, delete_stored_pdf, save_pdf

router = APIRouter(prefix="/papers", tags=["papers"])


def to_out(p: Paper) -> PaperOut:
    code = p.language or "other"
    return PaperOut(
        id=p.id,
        filename=p.filename,
        language=code,
        language_name=LANG_NAMES[code] if p.language else "Unknown",
        language_confidence=p.language_confidence,
        language_supported=bool(p.language_supported) if p.language_supported is not None else True,
        page_count=p.page_count,
        status=p.status,
        low_text_pages=p.low_text_pages or [],
        error_message=p.error_message,
        embedding_model=p.embedding_model,
        ocr_status=p.ocr_status or "not_needed",
        ocr_message=p.ocr_message,
        extraction_warnings=list(p.extraction_warnings or []),
        created_at=p.created_at,
    )


def _paper_or_404(db: Session, paper_id: str) -> Paper:
    paper = db.get(Paper, paper_id)
    if paper is None:
        raise HTTPException(404, "Paper not found.")
    return paper


def _cosine_similarity(
    left: list[float],
    right: list[float],
) -> float:
    """Calculate cosine similarity, returning zero for zero-length vectors."""
    if len(left) != len(right):
        raise ValueError("Embedding dimensions do not match.")

    dot_product = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))

    if left_norm == 0 or right_norm == 0:
        return 0.0

    return dot_product / (left_norm * right_norm)


@router.get("", response_model=list[PaperOut])
def list_papers(db: Session = Depends(get_db)):
    """List all uploaded research papers, ordered newest first."""
    stmt = select(Paper).order_by(Paper.created_at.desc())
    return [to_out(p) for p in db.scalars(stmt).all()]


@router.post("/compare", response_model=CompareOut)
def compare_papers(
    body: CompareRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Compare 2+ uploaded research papers across objectives, methods, datasets, and findings."""
    try:
        return compare_multiple_papers(db, body, settings)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except LlmError as exc:
        raise HTTPException(503, exc.message) from exc


@router.post("", response_model=PaperOut, status_code=201)
def upload_paper(
    request: Request,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = file.file.read(max_bytes + 1)

    if not data:
        raise HTTPException(400, "The uploaded file is empty.")

    if len(data) > max_bytes:
        raise HTTPException(
            413,
            f"Files larger than {settings.max_upload_mb} MB are not supported.",
        )

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    filename = (file.filename or "").lower()
    if content_type and content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(415, "Please upload a PDF file.")
    if filename and not filename.endswith(".pdf"):
        raise HTTPException(415, "Please upload a PDF file.")
    if b"%PDF" not in data[:1024]:
        raise HTTPException(415, "Please upload a PDF file.")

    sha = hashlib.sha256(data).hexdigest()

    # Reuse existing record if the exact same paper has already finished processing
    existing = db.scalars(
        select(Paper)
        .where(Paper.sha256 == sha, Paper.status == "ready")
        .order_by(Paper.created_at.desc())
    ).first()
    if existing and Path(existing.stored_path).exists():
        return to_out(existing)

    try:
        page_count = inspect_pdf(data, settings.max_pages)
    except PdfError as exc:
        raise HTTPException(422, exc.message) from exc

    paper_id = uuid.uuid4().hex
    path = save_pdf(settings.storage_dir, paper_id, data)

    paper = Paper(
        id=paper_id,
        filename=clean_filename(file.filename),
        stored_path=path,
        sha256=sha,
        size_bytes=len(data),
        page_count=page_count,
        status="processing",
        low_text_pages=[],
    )

    try:
        db.add(paper)
        db.commit()
        db.refresh(paper)
    except Exception:
        db.rollback()
        delete_pdf(path)
        raise

    background.add_task(
        process_paper,
        paper_id,
        request.app.state.session_factory,
        settings,
    )
    return to_out(paper)


@router.get("/{paper_id}", response_model=PaperOut)
def get_paper(paper_id: str, db: Session = Depends(get_db)):
    return to_out(_paper_or_404(db, paper_id))


@router.delete("/{paper_id}", status_code=204)
def delete_paper(
    paper_id: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Safely delete a paper, its cascade records, and its stored PDF file."""
    paper = _paper_or_404(db, paper_id)
    stored_path = paper.stored_path
    delete_stored_pdf(stored_path, settings.storage_dir)

    # Cascading delete in DB
    from sqlalchemy import delete
    from ..models import (
        AgentRun,
        AgentStep,
        ChatMessage,
        PaperChunk,
        PaperConcern,
        PaperNote,
        PaperPage,
        PaperSummary,
    )

    runs = db.scalars(select(AgentRun.id).where(AgentRun.paper_id == paper_id)).all()
    if runs:
        db.execute(delete(AgentStep).where(AgentStep.run_id.in_(runs)))
    db.execute(delete(AgentRun).where(AgentRun.paper_id == paper_id))
    db.execute(delete(PaperNote).where(PaperNote.paper_id == paper_id))
    db.execute(delete(ChatMessage).where(ChatMessage.paper_id == paper_id))
    db.execute(delete(PaperConcern).where(PaperConcern.paper_id == paper_id))
    db.execute(delete(PaperSummary).where(PaperSummary.paper_id == paper_id))
    db.execute(delete(PaperChunk).where(PaperChunk.paper_id == paper_id))
    db.execute(delete(PaperPage).where(PaperPage.paper_id == paper_id))
    db.delete(paper)
    db.commit()


@router.post("/{paper_id}/reprocess", response_model=PaperOut, status_code=202)
def reprocess_paper(
    paper_id: str,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Re-run extraction and chunking from the stored PDF."""
    paper = _paper_or_404(db, paper_id)

    if paper.status == "processing":
        raise HTTPException(409, "This paper is already being processed.")

    paper.status = "processing"
    paper.error_message = None
    db.commit()

    background.add_task(
        process_paper,
        paper_id,
        request.app.state.session_factory,
        settings,
    )
    return to_out(paper)


@router.get("/{paper_id}/pages", response_model=list[PageMeta])
def list_pages(paper_id: str, db: Session = Depends(get_db)):
    _paper_or_404(db, paper_id)

    stmt = (
        select(PaperPage)
        .where(PaperPage.paper_id == paper_id)
        .order_by(PaperPage.page_no)
    )
    return db.scalars(stmt).all()


@router.get("/{paper_id}/pages/{page_no}", response_model=PageOut)
def get_page(paper_id: str, page_no: int, db: Session = Depends(get_db)):
    _paper_or_404(db, paper_id)

    page = db.get(PaperPage, (paper_id, page_no))
    if page is None:
        raise HTTPException(404, "Page not found.")

    return page


@router.get("/{paper_id}/chunks", response_model=list[ChunkOut])
def list_chunks(
    paper_id: str,
    page: int | None = Query(None, ge=1, description="Only chunks from this page"),
    db: Session = Depends(get_db),
):
    _paper_or_404(db, paper_id)

    stmt = select(PaperChunk).where(PaperChunk.paper_id == paper_id)

    if page is not None:
        stmt = stmt.where(PaperChunk.page_no == page)

    stmt = stmt.order_by(PaperChunk.page_no, PaperChunk.chunk_index)
    return db.scalars(stmt).all()


@router.get("/{paper_id}/search", response_model=SearchResponse)
def search_paper(
    paper_id: str,
    q: str = Query(..., min_length=1, max_length=1000, description="Search question"),
    limit: int = Query(5, ge=1, le=20, description="Maximum number of results"),
    db: Session = Depends(get_db),
):
    """Find the most relevant text chunks using semantic similarity."""
    paper = _paper_or_404(db, paper_id)

    if paper.status != "ready":
        raise HTTPException(
            409,
            "This paper is not ready for search. Wait until processing completes.",
        )

    query = q.strip()
    if not query:
        raise HTTPException(422, "Search query must not be blank.")

    # Generate the query vector using the same model used for paper chunks.
    query_embedding = embed_query(query)

    stmt = select(PaperChunk).where(
        PaperChunk.paper_id == paper_id,
        PaperChunk.embedding.is_not(None),
    )

    if db.get_bind().dialect.name == "postgresql":
        # PostgreSQL uses pgvector to rank results inside the database.
        distance = PaperChunk.embedding.cosine_distance(query_embedding)
        ranked_rows = db.execute(
            select(PaperChunk, distance.label("distance"))
            .where(
                PaperChunk.paper_id == paper_id,
                PaperChunk.embedding.is_not(None),
            )
            .order_by(distance.asc())
            .limit(limit)
        ).all()

        results = [
            SearchResult(
                chunk_id=chunk.id,
                page_no=chunk.page_no,
                chunk_index=chunk.chunk_index,
                text=chunk.text,
                similarity=1.0 - float(distance_value),
            )
            for chunk, distance_value in ranked_rows
        ]
    else:
        # SQLite has no pgvector operators, so calculate similarity in Python.
        chunks = db.scalars(stmt).all()
        ranked = []

        for chunk in chunks:
            try:
                similarity = _cosine_similarity(
                    query_embedding,
                    list(chunk.embedding),
                )
            except (TypeError, ValueError):
                continue

            ranked.append((chunk, similarity))

        ranked.sort(key=lambda item: item[1], reverse=True)

        results = [
            SearchResult(
                chunk_id=chunk.id,
                page_no=chunk.page_no,
                chunk_index=chunk.chunk_index,
                text=chunk.text,
                similarity=float(similarity),
            )
            for chunk, similarity in ranked[:limit]
        ]

    return SearchResponse(
        paper_id=paper_id,
        query=query,
        results=results,
        query_language=detect_language_report(query).code,
        warning=query_language_warning(query),
    )


@router.get("/{paper_id}/notes", response_model=list[NoteOut])
def list_notes(paper_id: str, db: Session = Depends(get_db)):
    _paper_or_404(db, paper_id)
    stmt = select(PaperNote).where(PaperNote.paper_id == paper_id).order_by(PaperNote.created_at)
    return db.scalars(stmt).all()


@router.post("/{paper_id}/notes", response_model=NoteOut, status_code=201)
def create_note(paper_id: str, body: NoteCreate, db: Session = Depends(get_db)):
    _paper_or_404(db, paper_id)
    note = PaperNote(
        id=uuid.uuid4().hex,
        paper_id=paper_id,
        page_no=body.page_no,
        chunk_id=body.chunk_id,
        excerpt=body.excerpt,
        body=body.body,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{paper_id}/notes/{note_id}", status_code=204)
def delete_note(paper_id: str, note_id: str, db: Session = Depends(get_db)):
    _paper_or_404(db, paper_id)
    note = db.get(PaperNote, note_id)
    if note is None or note.paper_id != paper_id:
        raise HTTPException(404, "Note not found.")
    db.delete(note)
    db.commit()
