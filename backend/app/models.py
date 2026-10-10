from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Paper(Base):
    """One uploaded PDF and its processing status."""

    __tablename__ = "papers"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    stored_path: Mapped[str] = mapped_column(String(512))
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    size_bytes: Mapped[int] = mapped_column(Integer)
    page_count: Mapped[int] = mapped_column(Integer)
    language: Mapped[str | None] = mapped_column(String(8), nullable=True)
    language_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    language_supported: Mapped[bool] = mapped_column(Boolean, default=True)
    embedding_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ocr_status: Mapped[str] = mapped_column(String(32), default="not_needed")
    ocr_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    extraction_warnings: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(20))  # processing | ready | failed
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    low_text_pages: Mapped[list[int]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PaperPage(Base):
    """Extracted text of a single page, plus how it was extracted (provenance)."""

    __tablename__ = "paper_pages"

    paper_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("papers.id", ondelete="CASCADE"), primary_key=True
    )
    page_no: Mapped[int] = mapped_column(Integer, primary_key=True)  # 1-based
    text: Mapped[str] = mapped_column(Text)
    char_count: Mapped[int] = mapped_column(Integer)
    is_low_text: Mapped[bool] = mapped_column(Boolean)
    extraction_method: Mapped[str] = mapped_column(String(32))  # pymupdf_text | tesseract_ocr
    ocr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    rotation: Mapped[int] = mapped_column(Integer, default=0)
    language: Mapped[str | None] = mapped_column(String(8), nullable=True)


class PaperChunk(Base):
    """A slice of one page's text. Invariant: page.text[char_start:char_end] == text."""

    __tablename__ = "paper_chunks"
    __table_args__ = (
        UniqueConstraint("paper_id", "page_no", "chunk_index", name="uq_paper_chunks_position"),
        Index("ix_paper_chunks_paper_page", "paper_id", "page_no"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    paper_id: Mapped[str] = mapped_column(String(32), ForeignKey("papers.id", ondelete="CASCADE"))
    page_no: Mapped[int] = mapped_column(Integer)
    chunk_index: Mapped[int] = mapped_column(Integer)  # 0-based order within the page
    char_start: Mapped[int] = mapped_column(Integer)
    char_end: Mapped[int] = mapped_column(Integer)
    char_count: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)

    # PostgreSQL uses pgvector; SQLite uses JSON for test compatibility.
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(384).with_variant(JSON, "sqlite"),
        nullable=True,
    )


class PaperSummary(Base):
    """A generated structured summary, cached per paper and response language."""

    __tablename__ = "paper_summaries"

    paper_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("papers.id", ondelete="CASCADE"), primary_key=True
    )
    lang: Mapped[str] = mapped_column(String(8), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PaperConcern(Base):
    """Generated research concerns and evidence alerts, cached per paper and response language."""

    __tablename__ = "paper_concerns"

    paper_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("papers.id", ondelete="CASCADE"), primary_key=True
    )
    lang: Mapped[str] = mapped_column(String(8), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    """Persisted chat turn for one paper. No user accounts yet."""

    __tablename__ = "chat_messages"
    __table_args__ = (Index("ix_chat_messages_paper", "paper_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    paper_id: Mapped[str] = mapped_column(String(32), ForeignKey("papers.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    sources: Mapped[list] = mapped_column(JSON, default=list)
    lang: Mapped[str | None] = mapped_column(String(8), nullable=True)
    grounding: Mapped[str | None] = mapped_column(String(16), nullable=True)
    interpretation: Mapped[str | None] = mapped_column(Text, nullable=True)
    warning: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PaperNote(Base):
    """User-saved note or highlighted evidence passage."""

    __tablename__ = "paper_notes"
    __table_args__ = (Index("ix_paper_notes_paper", "paper_id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    paper_id: Mapped[str] = mapped_column(String(32), ForeignKey("papers.id", ondelete="CASCADE"))
    page_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chunk_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    excerpt: Mapped[str] = mapped_column(Text, default="")
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AgentRun(Base):
    """Bounded research-agent execution for one request."""

    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    paper_id: Mapped[str] = mapped_column(String(32), ForeignKey("papers.id", ondelete="CASCADE"))
    task: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20))
    lang: Mapped[str] = mapped_column(String(8), default="auto")
    allowed_paper_ids: Mapped[list] = mapped_column(JSON, default=list)
    plan: Mapped[list] = mapped_column(JSON, default=list)
    report: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_calls: Mapped[int] = mapped_column(Integer, default=0)
    retrievals: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AgentStep(Base):
    """One planned or executed tool step in an agent run."""

    __tablename__ = "agent_steps"
    __table_args__ = (Index("ix_agent_steps_run", "run_id", "step_index"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(32), ForeignKey("agent_runs.id", ondelete="CASCADE"))
    step_index: Mapped[int] = mapped_column(Integer)
    tool: Mapped[str] = mapped_column(String(64))
    arguments: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    citations: Mapped[list] = mapped_column(JSON, default=list)
