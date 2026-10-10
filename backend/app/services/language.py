from dataclasses import dataclass

from lingua import Language as L
from lingua import LanguageDetectorBuilder

LANG_NAMES = {
    "ja": "Japanese",
    "en": "English",
    "si": "Sinhala",
    "zh": "Chinese",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "other": "Other",
}

# Languages we will generate answers in. Detection may still return these codes.
RESPONSE_LANGUAGES = {"en", "ja", "si", "zh", "es", "fr", "de"}

# Languages the configured embedding model documents covering well.
# paraphrase-multilingual-MiniLM-L12-v2 is trained on ~50 languages (OPUS / MUSE).
# Sinhala is not in that documented set; retrieval quality is not claimed.
EMBEDDING_DOCUMENTED_LANGUAGES = {
    "en",
    "ar",
    "bg",
    "ca",
    "cs",
    "da",
    "de",
    "el",
    "es",
    "et",
    "fa",
    "fi",
    "fr",
    "gl",
    "hi",
    "hr",
    "hu",
    "id",
    "it",
    "ja",
    "ko",
    "lt",
    "lv",
    "mk",
    "nl",
    "no",
    "pl",
    "pt",
    "ro",
    "ru",
    "sk",
    "sl",
    "sr",
    "sv",
    "th",
    "tr",
    "uk",
    "vi",
    "zh",
}

# Languages exercised by this project's automated tests.
TESTED_LANGUAGES = {"en", "ja", "si", "zh", "es", "fr", "de"}

_LATIN = {L.ENGLISH: "en", L.SPANISH: "es", L.FRENCH: "fr", L.GERMAN: "de"}
_detector = LanguageDetectorBuilder.from_languages(*_LATIN).build()

LOW_CONFIDENCE = 0.45


@dataclass(frozen=True)
class LanguageReport:
    code: str
    name: str
    confidence: float
    supported: bool
    warning: str | None = None


def _script_scores(sample: str) -> tuple[int, float, float, float]:
    letters = sum(c.isalpha() for c in sample)
    if letters == 0:
        return 0, 0.0, 0.0, 0.0
    sinhala = sum("\u0d80" <= c <= "\u0dff" for c in sample) / letters
    kana = sum("\u3040" <= c <= "\u30ff" for c in sample) / letters
    han = sum("\u4e00" <= c <= "\u9fff" for c in sample) / letters
    return letters, sinhala, kana, han


def detect_language(text: str) -> str:
    """Backwards-compatible language code used throughout the pipeline."""
    return detect_language_report(text).code


def detect_language_report(text: str) -> LanguageReport:
    """Detect language of extracted or query text and record confidence."""
    sample = (text or "")[:5000]
    letters, sinhala, kana, han = _script_scores(sample)
    if letters == 0:
        return LanguageReport(
            "other",
            LANG_NAMES["other"],
            0.0,
            False,
            "No alphabetic text was available for language detection.",
        )

    if sinhala > 0.2:
        return _finalize("si", min(1.0, sinhala + 0.3))
    if kana > 0.05:
        return _finalize("ja", min(1.0, 0.55 + kana))
    if han > 0.2:
        return _finalize("zh", min(1.0, han + 0.3))

    confidences = _detector.compute_language_confidence_values(sample)
    if not confidences:
        return _finalize("other", 0.0)
    top = confidences[0]
    code = _LATIN.get(top.language, "other")
    return _finalize(code, float(top.value))


def _finalize(code: str, confidence: float) -> LanguageReport:
    supported = code in RESPONSE_LANGUAGES and confidence >= LOW_CONFIDENCE
    warning = None
    if code == "other" or confidence < LOW_CONFIDENCE:
        supported = False
        warning = (
            "The document language could not be identified reliably. "
            "Answers may be less accurate."
        )
    elif code == "si":
        warning = (
            "Sinhala is supported for display and generation, but the embedding model "
            "does not document Sinhala coverage. Cross-language retrieval is not guaranteed."
        )
    elif code not in EMBEDDING_DOCUMENTED_LANGUAGES:
        warning = (
            f"{LANG_NAMES.get(code, code)} is not in the embedding model's documented "
            "language list. Semantic search may be unreliable."
        )
        supported = False
    return LanguageReport(code, LANG_NAMES.get(code, "Other"), confidence, supported, warning)


def query_language_warning(query: str) -> str | None:
    report = detect_language_report(query)
    if report.code == "other":
        return (
            "The query language is not recognized. Retrieval will still run, but results "
            "may be unreliable."
        )
    if report.code not in EMBEDDING_DOCUMENTED_LANGUAGES and report.code != "si":
        return (
            f"Queries in {report.name} are outside the embedding model's documented "
            "coverage. Do not treat ranking as reliable."
        )
    return report.warning if report.code == "si" else None
