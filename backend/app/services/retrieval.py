import math
import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import PaperChunk
from .embeddings import embed_query

_TOKEN = re.compile(r"\w+", re.UNICODE)


@dataclass
class Hit:
    paper_id: str
    chunk_id: int
    page_no: int
    chunk_index: int
    text: str
    score: float  # cosine similarity, higher is better


def _cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0.0


def _tokens(text: str) -> set[str]:
    return {t.lower() for t in _TOKEN.findall(text)}


def rerank(query: str, hits: list[Hit]) -> list[Hit]:
    """Blend vector similarity with lexical overlap. No extra model required."""
    query_tokens = _tokens(query)
    if not query_tokens:
        return hits
    scored: list[Hit] = []
    for hit in hits:
        overlap = len(query_tokens & _tokens(hit.text)) / len(query_tokens)
        blended = 0.75 * hit.score + 0.25 * overlap
        scored.append(
            Hit(hit.paper_id, hit.chunk_id, hit.page_no, hit.chunk_index, hit.text, blended)
        )
    return sorted(scored, key=lambda h: h.score, reverse=True)


def _allowed_ids(paper_id: str, paper_ids: list[str] | None) -> list[str]:
    """Document-level isolation: search only the caller-provided paper set."""
    requested = paper_ids if paper_ids is not None else [paper_id]
    allowed = []
    for pid in requested:
        if pid and pid not in allowed:
            allowed.append(pid)
    return allowed or [paper_id]


def _lexical_hits(chunks: list[PaperChunk], query: str, limit: int) -> list[Hit]:
    query_tokens = _tokens(query)
    if not query_tokens:
        return []
    scored: list[Hit] = []
    for chunk in chunks:
        overlap = len(query_tokens & _tokens(chunk.text)) / len(query_tokens)
        if overlap <= 0:
            continue
        scored.append(
            Hit(chunk.paper_id, chunk.id, chunk.page_no, chunk.chunk_index, chunk.text, overlap)
        )
    scored.sort(key=lambda h: h.score, reverse=True)
    return scored[:limit]


def _merge_hits(left: list[Hit], right: list[Hit]) -> list[Hit]:
    by_id: dict[int, Hit] = {}
    for hit in left + right:
        existing = by_id.get(hit.chunk_id)
        if existing is None or hit.score > existing.score:
            by_id[hit.chunk_id] = hit
    return list(by_id.values())


def retrieve(
    db: Session,
    paper_id: str,
    query: str,
    k: int = 6,
    candidate_k: int | None = None,
    min_score: float | None = None,
    use_rerank: bool = False,
    paper_ids: list[str] | None = None,
) -> list[Hit]:
    """Top-k chunks from the permitted paper set by cosine similarity plus lexical overlap."""
    allowed = _allowed_ids(paper_id, paper_ids)
    vector = embed_query(query)
    fetch_k = candidate_k or k
    scoped = select(PaperChunk).where(
        PaperChunk.paper_id.in_(allowed),
        PaperChunk.embedding.is_not(None),
    )
    if db.get_bind().dialect.name == "postgresql":
        distance = PaperChunk.embedding.cosine_distance(vector)
        rows = db.execute(
            select(
                PaperChunk.paper_id,
                PaperChunk.id,
                PaperChunk.page_no,
                PaperChunk.chunk_index,
                PaperChunk.text,
                (1 - distance).label("score"),
            )
            .where(PaperChunk.paper_id.in_(allowed), PaperChunk.embedding.is_not(None))
            .order_by(distance)
            .limit(fetch_k)
        ).all()
        vector_hits = [
            Hit(r.paper_id, r.id, r.page_no, r.chunk_index, r.text, float(r.score))
            for r in rows
        ]
        chunks = db.scalars(scoped).all()
    else:
        chunks = db.scalars(scoped).all()
        vector_hits = [
            Hit(c.paper_id, c.id, c.page_no, c.chunk_index, c.text, _cosine(vector, list(c.embedding)))
            for c in chunks
        ]
        vector_hits.sort(key=lambda h: h.score, reverse=True)
        vector_hits = vector_hits[:fetch_k]

    hits = _merge_hits(vector_hits, _lexical_hits(chunks, query, fetch_k))
    if use_rerank:
        hits = rerank(query, hits)
    if min_score is not None:
        hits = [h for h in hits if h.score >= min_score]
    hits.sort(key=lambda h: h.score, reverse=True)
    return hits[:k]
