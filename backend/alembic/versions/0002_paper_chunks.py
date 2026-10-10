"""paper_chunks

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-09
"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "paper_chunks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("paper_id", sa.String(32), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("page_no", sa.Integer(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("char_start", sa.Integer(), nullable=False),
        sa.Column("char_end", sa.Integer(), nullable=False),
        sa.Column("char_count", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.UniqueConstraint("paper_id", "page_no", "chunk_index", name="uq_paper_chunks_position"),
    )
    op.create_index("ix_paper_chunks_paper_page", "paper_chunks", ["paper_id", "page_no"])


def downgrade() -> None:
    op.drop_index("ix_paper_chunks_paper_page", table_name="paper_chunks")
    op.drop_table("paper_chunks")
