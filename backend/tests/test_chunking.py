from app.services.chunking import chunk_page


def check_offsets(text, chunks):
    for c in chunks:
        assert text[c.start : c.end] == c.text


def test_short_text_is_a_single_chunk():
    text = "  A short paragraph that is long enough to keep as a chunk.  "
    chunks = chunk_page(text)
    assert len(chunks) == 1
    assert chunks[0].text == text.strip()
    check_offsets(text, chunks)


def test_empty_and_whitespace_only_text_give_no_chunks():
    assert chunk_page("") == []
    assert chunk_page("   \n\n  ") == []


def test_tiny_fragments_are_dropped():
    assert chunk_page("Page 3") == []


def test_long_text_is_split_with_overlap_and_no_gaps():
    text = " ".join(f"Sentence number {i} explains one detail of the method." for i in range(120))
    chunks = chunk_page(text, max_chars=500, overlap=80)
    assert len(chunks) > 5
    check_offsets(text, chunks)
    assert all(len(c.text) <= 500 for c in chunks)
    assert [c.index for c in chunks] == list(range(len(chunks)))
    for a, b in zip(chunks, chunks[1:]):
        assert b.start < a.end  # chunks overlap, so nothing falls between them
        assert b.start > a.start  # and the window always moves forward
    assert chunks[0].start == 0
    assert chunks[-1].end == len(text)


def test_chunks_end_at_sentence_boundaries_when_possible():
    text = " ".join(f"This is sentence number {i} of the test document." for i in range(200))
    chunks = chunk_page(text, max_chars=500, overlap=80)
    for c in chunks[:-1]:
        assert c.text.endswith(".")


def test_paragraph_break_is_preferred():
    paragraph = ("word " * 60).strip()
    text = paragraph + "\n\n" + paragraph
    chunks = chunk_page(text, max_chars=400, overlap=50)
    assert chunks[0].text == paragraph
    check_offsets(text, chunks)


def test_text_without_spaces_is_still_split():
    text = "研究" * 1500
    chunks = chunk_page(text, max_chars=500, overlap=80)
    assert len(chunks) >= 6
    check_offsets(text, chunks)
    assert all(len(c.text) <= 500 for c in chunks)
    assert chunks[-1].end == len(text)


def test_japanese_sentences_end_at_the_full_stop():
    text = "これは研究に関する文です。" * 300
    chunks = chunk_page(text, max_chars=400, overlap=60)
    check_offsets(text, chunks)
    for c in chunks[:-1]:
        assert c.text.endswith("。")
