"""paper_concerns

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-10
"""
import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "paper_concerns",
        sa.Column(
            "paper_id",
            sa.String(32),
            sa.ForeignKey("papers.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("lang", sa.String(8), primary_key=True),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("paper_concerns")
