import pytest

from app.services.extraction import PdfError, extract_pages, inspect_pdf
from app.services.language import detect_language
from tests.helpers import make_pdf


def test_text_is_extracted_separately_for_each_page():
    data = make_pdf(["Alpha page one", "Beta page two", "Gamma page three"])
    pages = extract_pages(data, min_page_chars=5)
    assert [p.page_no for p in pages] == [1, 2, 3]
    assert "Alpha" in pages[0].text
    assert "Beta" in pages[1].text and "Alpha" not in pages[1].text
    assert "Gamma" in pages[2].text
    assert all(p.char_count > 0 and not p.is_low_text for p in pages)


def test_scanned_page_is_flagged_but_blank_page_is_not():
    data = make_pdf(["Some real text on page one", None, ""])
    pages = extract_pages(data, min_page_chars=100)
    assert pages[0].is_low_text is False  # real text, no image
    assert pages[1].is_low_text is True   # image only: looks scanned
    assert pages[2].is_low_text is False  # blank, no image


def test_inspect_pdf_returns_page_count():
    assert inspect_pdf(make_pdf(["a", "b", "c"]), max_pages=10) == 3


def test_inspect_pdf_rejects_password_protected():
    with pytest.raises(PdfError) as exc:
        inspect_pdf(make_pdf(["secret"], password="pw"), max_pages=10)
    assert exc.value.code == "encrypted"


def test_inspect_pdf_rejects_garbage():
    with pytest.raises(PdfError):
        inspect_pdf(b"%PDF-1.4 this is not really a pdf", max_pages=10)


def test_inspect_pdf_enforces_page_limit():
    with pytest.raises(PdfError) as exc:
        inspect_pdf(make_pdf(["a", "b", "c"]), max_pages=2)
    assert exc.value.code == "too_long"


def test_detect_language_by_script_and_text():
    assert detect_language("This research paper studies neural networks for language translation.") == "en"
    assert detect_language("これは機械翻訳に関する研究論文です。") == "ja"
    assert detect_language("මෙය පර්යේෂණ පත්‍රිකාවක් වන අතර එය භාෂා පරිවර්තනය ගැන කතා කරයි") == "si"
    assert detect_language("") == "other"
