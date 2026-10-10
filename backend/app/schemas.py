from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

LanguageCode = Literal["ja", "en", "si", "zh", "es", "fr", "de", "other"]


class PaperOut(BaseModel):
    id: str
    filename: str
    language: LanguageCode
    language_name: str
    language_confidence: float | None = None
    language_supported: bool = True
    page_count: int
    status: Literal["processing", "ready", "failed"]
    low_text_pages: list[int]
    error_message: str | None = None
    embedding_model: str | None = None
    ocr_status: str = "not_needed"
    ocr_message: str | None = None
    extraction_warnings: list[str] = []
    created_at: datetime | None = None


class PageMeta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    page_no: int
    char_count: int
    is_low_text: bool
    extraction_method: str
    ocr_confidence: float | None = None
    rotation: int = 0
    language: str | None = None


class PageOut(PageMeta):
    text: str


class ChunkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    page_no: int
    chunk_index: int
    char_start: int
    char_end: int
    char_count: int
    text: str


class SearchResult(BaseModel):
    """A semantically relevant chunk returned by paper search."""

    chunk_id: int
    page_no: int
    chunk_index: int
    text: str
    similarity: float


class SearchResponse(BaseModel):
    """Results for a semantic search query."""

    paper_id: str
    query: str
    results: list[SearchResult]
    query_language: str | None = None
    warning: str | None = None


class NoteCreate(BaseModel):
    page_no: int | None = Field(default=None, ge=1)
    chunk_id: int | None = None
    excerpt: str = Field(default="", max_length=4000)
    body: str = Field(min_length=1, max_length=8000)


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    paper_id: str
    page_no: int | None
    chunk_id: int | None
    excerpt: str
    body: str
    created_at: datetime | None = None
