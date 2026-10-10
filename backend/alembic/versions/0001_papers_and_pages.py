"""papers and paper_pages

Revision ID: 0001
Revises:
Create Date: 2026-10-09
"""
import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Makes pgvector available for milestone B. Not needed (or possible) on SQLite.
    if op.get_bind().dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "papers",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("stored_path", sa.String(512), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("page_count", sa.Integer(), nullable=False),
        sa.Column("language", sa.String(8), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("low_text_pages", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_papers_sha256", "papers", ["sha256"])

    op.create_table(
        "paper_pages",
        sa.Column("paper_id", sa.String(32), sa.ForeignKey("papers.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("page_no", sa.Integer(), primary_key=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("char_count", sa.Integer(), nullable=False),
        sa.Column("is_low_text", sa.Boolean(), nullable=False),
        sa.Column("extraction_method", sa.String(32), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("paper_pages")
    op.drop_index("ix_papers_sha256", table_name="papers")
    op.drop_table("papers")
