
"""add chunk embeddings

Revision ID: 6aecca91e2ff
Revises: 0002
Create Date: 2026-10-09
"""

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

# Revision identifiers, used by Alembic.
revision = "6aecca91e2ff"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        op.add_column(
            "paper_chunks",
            sa.Column("embedding", Vector(384), nullable=True),
        )
    else:
        # SQLite uses JSON to keep migration tests compatible.
        op.add_column(
            "paper_chunks",
            sa.Column("embedding", sa.JSON(), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("paper_chunks", "embedding")

