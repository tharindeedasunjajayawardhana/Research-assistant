"""research platform columns and tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-10
"""
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("papers", sa.Column("language_confidence", sa.Float(), nullable=True))
    op.add_column(
        "papers",
        sa.Column("language_supported", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column("papers", sa.Column("embedding_model", sa.String(128), nullable=True))
    op.add_column(
        "papers",
        sa.Column("ocr_status", sa.String(32), nullable=False, server_default="not_needed"),
    )
    op.add_column("papers", sa.Column("ocr_message", sa.Text(), nullable=True))
    op.add_column(
        "papers",
        sa.Column("extraction_warnings", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )

    op.add_column("paper_pages", sa.Column("ocr_confidence", sa.Float(), nullable=True))
    op.add_column(
        "paper_pages",
        sa.Column("rotation", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("paper_pages", sa.Column("language", sa.String(8), nullable=True))

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("paper_id", sa.String(32), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("sources", sa.JSON(), nullable=False),
        sa.Column("lang", sa.String(8), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_chat_messages_paper", "chat_messages", ["paper_id", "created_at"])

    op.create_table(
        "paper_notes",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("paper_id", sa.String(32), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("page_no", sa.Integer(), nullable=True),
        sa.Column("chunk_id", sa.Integer(), nullable=True),
        sa.Column("excerpt", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_paper_notes_paper", "paper_notes", ["paper_id"])

    op.create_table(
        "agent_runs",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("paper_id", sa.String(32), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("lang", sa.String(8), nullable=False, server_default="auto"),
        sa.Column("allowed_paper_ids", sa.JSON(), nullable=False),
        sa.Column("plan", sa.JSON(), nullable=False),
        sa.Column("report", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("llm_calls", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("retrievals", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "agent_steps",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("run_id", sa.String(32), sa.ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_index", sa.Integer(), nullable=False),
        sa.Column("tool", sa.String(64), nullable=False),
        sa.Column("arguments", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("citations", sa.JSON(), nullable=False),
    )
    op.create_index("ix_agent_steps_run", "agent_steps", ["run_id", "step_index"])


def downgrade() -> None:
    op.drop_index("ix_agent_steps_run", table_name="agent_steps")
    op.drop_table("agent_steps")
    op.drop_table("agent_runs")
    op.drop_index("ix_paper_notes_paper", table_name="paper_notes")
    op.drop_table("paper_notes")
    op.drop_index("ix_chat_messages_paper", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_column("paper_pages", "language")
    op.drop_column("paper_pages", "rotation")
    op.drop_column("paper_pages", "ocr_confidence")
    op.drop_column("papers", "extraction_warnings")
    op.drop_column("papers", "ocr_message")
    op.drop_column("papers", "ocr_status")
    op.drop_column("papers", "embedding_model")
    op.drop_column("papers", "language_supported")
    op.drop_column("papers", "language_confidence")
