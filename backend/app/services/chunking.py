from dataclasses import dataclass

_SENTENCE_ENDS = (". ", ".\n", "? ", "?\n", "! ", "!\n", "。", "？", "！")


@dataclass
class Chunk:
    index: int  # 0-based position within the page
    start: int  # offsets into the page text
    end: int
    text: str  # always page_text[start:end]


def _best_break(text: str, lo: int, hi: int) -> int | None:
    """Pick a natural cut point (exclusive end) in text[lo:hi]: paragraph, sentence, then word."""
    segment = text[lo:hi]
    paragraph = segment.rfind("\n\n")
    if paragraph != -1:
        return lo + paragraph
    sentence = max(segment.rfind(token) for token in _SENTENCE_ENDS)
    if sentence != -1:
        return lo + sentence + 1  # keep the punctuation mark
    space = max(segment.rfind(" "), segment.rfind("\n"))
    if space != -1:
        return lo + space
    return None  # e.g. Japanese or Sinhala without spaces: hard cut


def _align_to_word(text: str, pos: int, limit: int) -> int:
    """Move a chunk start forward to the next word start so chunks don't begin mid-word."""
    if pos <= 0 or text[pos - 1].isspace():
        return pos
    for i in range(pos, min(pos + 40, limit)):
        if text[i].isspace():
            return i + 1
    return pos


def chunk_page(
    text: str, max_chars: int = 1200, overlap: int = 150, min_chars: int = 30
) -> list[Chunk]:
    """Split one page into overlapping chunks that never cross the page boundary."""
    if overlap >= max_chars // 2:
        raise ValueError("overlap must be smaller than half of max_chars")
    chunks: list[Chunk] = []
    n = len(text)
    start = 0
    while start < n:
        end = min(start + max_chars, n)
        if end < n:
            cut = _best_break(text, start + max_chars // 2, end)
            if cut is not None:
                end = cut
        s, e = start, end
        while s < e and text[s].isspace():
            s += 1
        while e > s and text[e - 1].isspace():
            e -= 1
        if e - s >= min_chars:
            chunks.append(Chunk(len(chunks), s, e, text[s:e]))
        if end >= n:
            break
        start = _align_to_word(text, end - overlap, end)
    return chunks
