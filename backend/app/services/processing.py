import logging
from pathlib import Path

from sqlalchemy import delete

from ..models import Paper, PaperChunk, PaperConcern, PaperPage, PaperSummary
from .chunking import chunk_page
from .embeddings import configured_model_name, embed_texts
from .extraction import PdfError, extract_pages
from .language import detect_language_report
from .ocr import get_ocr_adapter

log = logging.getLogger(__name__)


def process_paper(paper_id: str, session_factory, settings) -> None:
    """Extract pages, create chunks and embeddings, then update paper status.
    Safe to run again: old pages and chunks are replaced."""
    with session_factory() as db:
        try:
            paper = db.get(Paper, paper_id)
            if paper is None:
                return

            data = Path(paper.stored_path).read_bytes()
            adapter = get_ocr_adapter(settings)
            ocr_available, ocr_unavailable_reason = adapter.status()
            ocr = adapter if settings.ocr_enabled and ocr_available else None

            pages = extract_pages(
                data,
                settings.min_page_chars,
                ocr=ocr,
                ocr_languages=settings.ocr_languages,
            )
            low = [p.page_no for p in pages if p.is_low_text]
            warnings: list[str] = []
            for page in pages:
                warnings.extend(page.warnings)

            ocr_used = any(p.extraction_method == "tesseract_ocr" for p in pages)
            scanned_needed = any(
                p.extraction_method == "pymupdf_text" and p.is_low_text for p in pages
            )
            if not ocr_available and (low or scanned_needed):
                warnings.append(ocr_unavailable_reason or "OCR is unavailable.")
                ocr_status = "unavailable"
                ocr_message = ocr_unavailable_reason
            elif ocr_used and scanned_needed:
                ocr_status = "partial"
                ocr_message = "Some scanned pages still have little usable text."
            elif ocr_used:
                ocr_status = "complete"
                ocr_message = None
            elif low:
                ocr_status = "needed"
                ocr_message = "Some pages look scanned. Text extraction may be incomplete."
            else:
                ocr_status = "not_needed"
                ocr_message = None

            if not any(p.char_count for p in pages) and not low:
                raise PdfError("no_text", "This PDF contains no readable text.")

            chunk_records = []
            for p in pages:
                for c in chunk_page(
                    p.text,
                    settings.chunk_max_chars,
                    settings.chunk_overlap,
                ):
                    chunk_records.append(
                        {
                            "page_no": p.page_no,
                            "chunk_index": c.index,
                            "char_start": c.start,
                            "char_end": c.end,
                            "char_count": len(c.text),
                            "text": c.text,
                        }
                    )

            texts = [chunk["text"] for chunk in chunk_records]
            embeddings = embed_texts(texts)

            if len(embeddings) != len(chunk_records):
                raise RuntimeError("Embedding count does not match chunk count.")

            db.execute(delete(PaperChunk).where(PaperChunk.paper_id == paper_id))
            db.execute(delete(PaperPage).where(PaperPage.paper_id == paper_id))
            db.execute(delete(PaperSummary).where(PaperSummary.paper_id == paper_id))
            db.execute(delete(PaperConcern).where(PaperConcern.paper_id == paper_id))

            full_text = " ".join(p.text for p in pages)
            lang = detect_language_report(full_text)
            if lang.warning:
                warnings.append(lang.warning)

            for p in pages:
                page_lang = detect_language_report(p.text).code if p.text.strip() else lang.code
                db.add(
                    PaperPage(
                        paper_id=paper_id,
                        page_no=p.page_no,
                        text=p.text,
                        char_count=p.char_count,
                        is_low_text=p.is_low_text,
                        extraction_method=p.extraction_method,
                        ocr_confidence=p.ocr_confidence,
                        rotation=p.rotation,
                        language=page_lang,
                    )
                )

            for chunk, embedding in zip(chunk_records, embeddings):
                db.add(
                    PaperChunk(
                        paper_id=paper_id,
                        page_no=chunk["page_no"],
                        chunk_index=chunk["chunk_index"],
                        char_start=chunk["char_start"],
                        char_end=chunk["char_end"],
                        char_count=chunk["char_count"],
                        text=chunk["text"],
                        embedding=embedding,
                    )
                )

            paper.language = lang.code
            paper.language_confidence = lang.confidence
            paper.language_supported = lang.supported
            paper.embedding_model = configured_model_name()
            paper.ocr_status = ocr_status
            paper.ocr_message = ocr_message
            paper.extraction_warnings = list(dict.fromkeys(warnings))
            paper.low_text_pages = low
            paper.page_count = len(pages)
            paper.status = "ready"
            paper.error_message = None
            db.commit()

        except Exception as exc:
            db.rollback()

            if isinstance(exc, PdfError):
                message = exc.message
            else:
                log.exception("Processing failed for paper %s", paper_id)
                message = "Something went wrong while reading this PDF."

            paper = db.get(Paper, paper_id)
            if paper is not None:
                paper.status = "failed"
                paper.error_message = message
                db.commit()
