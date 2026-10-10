from dataclasses import dataclass, field

import pymupdf

from .ocr import OcrAdapter, OcrPageResult


class PdfError(Exception):
    """A problem with the uploaded PDF that the user can understand and fix."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class ExtractedPage:
    page_no: int  # 1-based
    text: str
    char_count: int
    is_low_text: bool
    extraction_method: str = "pymupdf_text"
    ocr_confidence: float | None = None
    rotation: int = 0
    warnings: list[str] = field(default_factory=list)


def inspect_pdf(data: bytes, max_pages: int) -> int:
    """Cheap upfront validation. Returns the page count or raises PdfError."""
    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception:
        raise PdfError("unreadable", "We couldn't read that PDF. The file may be corrupted.")
    with doc:
        if doc.needs_pass:
            raise PdfError(
                "encrypted",
                "This PDF is password-protected. Remove the password and upload it again.",
            )
        count = doc.page_count
    if count == 0:
        raise PdfError("empty", "This PDF has no pages.")
    if count > max_pages:
        raise PdfError("too_long", f"This PDF has {count} pages; the limit is {max_pages}.")
    return count


def _render_page_png(page) -> bytes:
    pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
    return pix.tobytes("png")


def extract_pages(
    data: bytes,
    min_page_chars: int,
    ocr: OcrAdapter | None = None,
    ocr_languages: str = "eng",
) -> list[ExtractedPage]:
    """Per-page text. OCR runs only on pages that lack usable native text."""
    pages: list[ExtractedPage] = []
    with pymupdf.open(stream=data, filetype="pdf") as doc:
        for index, page in enumerate(doc, start=1):
            native = page.get_text().replace("\x00", "")
            chars = len(native.strip())
            has_image = bool(page.get_images())
            low = chars < min_page_chars and has_image
            rotation = int(getattr(page, "rotation", 0) or 0)
            result = ExtractedPage(
                page_no=index,
                text=native,
                char_count=chars,
                is_low_text=low,
                extraction_method="pymupdf_text",
                rotation=rotation,
            )

            # OCR only when native text is unusable and the page has images.
            if ocr is not None and chars < min_page_chars and has_image:
                ocr_result = _ocr_page(ocr, page, ocr_languages)
                _apply_ocr(result, native, ocr_result, min_page_chars)

            pages.append(result)
    return pages


def _ocr_page(ocr: OcrAdapter, page, languages: str) -> OcrPageResult:
    try:
        png = _render_page_png(page)
    except Exception:
        return OcrPageResult("", None, True, "Could not render this page for OCR.")
    return ocr.ocr_image(png, languages)


def _apply_ocr(
    result: ExtractedPage,
    native: str,
    ocr_result: OcrPageResult,
    min_page_chars: int,
) -> None:
    if not ocr_result.available:
        result.warnings.append(ocr_result.message or "OCR is unavailable.")
        return
    if ocr_result.message and not ocr_result.text:
        result.warnings.append(ocr_result.message)
        return
    ocr_text = (ocr_result.text or "").replace("\x00", "").strip()
    native_stripped = native.strip()
    if not ocr_text:
        return
    # Prefer OCR when native text is unusable; do not concatenate both sources.
    if len(ocr_text) > len(native_stripped):
        result.text = ocr_text + ("\n" if not ocr_text.endswith("\n") else "")
        result.char_count = len(result.text.strip())
        result.extraction_method = "tesseract_ocr"
        result.ocr_confidence = ocr_result.confidence
        result.is_low_text = result.char_count < min_page_chars
        if ocr_result.confidence is not None and ocr_result.confidence < 0.4:
            result.warnings.append(
                f"OCR confidence is low on page {result.page_no}."
            )
    elif native_stripped:
        result.warnings.append(
            f"OCR did not improve on native text for page {result.page_no}."
        )
