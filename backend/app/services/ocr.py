"""Optional Tesseract OCR adapter.

Installing pytesseract does not install the Tesseract executable or language packs.
The adapter reports unavailability instead of failing the native-text pipeline.
"""

from __future__ import annotations

import logging
import shutil
from dataclasses import dataclass

log = logging.getLogger(__name__)


@dataclass
class OcrPageResult:
    text: str
    confidence: float | None
    available: bool
    message: str | None = None


class OcrAdapter:
    """Small interface so tests can inject a fake engine."""

    def status(self) -> tuple[bool, str | None]:
        raise NotImplementedError

    def ocr_image(self, image_bytes: bytes, languages: str) -> OcrPageResult:
        raise NotImplementedError


class UnavailableOcr(OcrAdapter):
    def __init__(self, message: str):
        self.message = message

    def status(self) -> tuple[bool, str | None]:
        return False, self.message

    def ocr_image(self, image_bytes: bytes, languages: str) -> OcrPageResult:
        return OcrPageResult("", None, False, self.message)


class TesseractOcr(OcrAdapter):
    def __init__(self, executable: str | None = None):
        self.executable = executable or shutil.which("tesseract")

    def status(self) -> tuple[bool, str | None]:
        if not self.executable:
            return False, (
                "Tesseract is not installed. Native PDF text extraction still works. "
                "To OCR scanned pages, install Tesseract and language packs "
                "(e.g. eng, jpn, chi_sim, sin), then set OCR_EXECUTABLE if it is not on PATH."
            )
        try:
            import pytesseract  # noqa: F401
        except ImportError:
            return False, "The pytesseract Python package is not installed."
        return True, None

    def ocr_image(self, image_bytes: bytes, languages: str) -> OcrPageResult:
        available, message = self.status()
        if not available:
            return OcrPageResult("", None, False, message)
        try:
            import pytesseract
            from PIL import Image
            import io

            if self.executable:
                pytesseract.pytesseract.tesseract_cmd = self.executable
            image = Image.open(io.BytesIO(image_bytes))
            data = pytesseract.image_to_data(
                image, lang=languages or "eng", output_type=pytesseract.Output.DICT
            )
            words = [w for w in data.get("text", []) if w and w.strip()]
            confs = []
            for value in data.get("conf", []):
                try:
                    number = float(value)
                except (TypeError, ValueError):
                    continue
                if number >= 0:
                    confs.append(number)
            text = " ".join(words).strip()
            confidence = (sum(confs) / len(confs) / 100.0) if confs else None
            if not text:
                return OcrPageResult(
                    "",
                    confidence,
                    True,
                    "OCR ran but produced no usable text for this page.",
                )
            return OcrPageResult(text, confidence, True, None)
        except Exception as exc:
            message = str(exc)
            if "Failed loading language" in message or "Error opening data file" in message:
                return OcrPageResult(
                    "",
                    None,
                    True,
                    f"Tesseract language pack is missing for '{languages}'.",
                )
            log.exception("OCR failed")
            return OcrPageResult("", None, True, "OCR failed for this page.")


def get_ocr_adapter(settings) -> OcrAdapter:
    if not settings.ocr_enabled:
        return UnavailableOcr("OCR is disabled.")
    return TesseractOcr(settings.ocr_executable or None)
