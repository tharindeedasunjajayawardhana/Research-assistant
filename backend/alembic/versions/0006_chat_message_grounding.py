"""chat message grounding fields

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-10
"""
import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_messages", sa.Column("grounding", sa.String(16), nullable=True))
    op.add_column("chat_messages", sa.Column("interpretation", sa.Text(), nullable=True))
    op.add_column("chat_messages", sa.Column("warning", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("chat_messages", "warning")
    op.drop_column("chat_messages", "interpretation")
    op.drop_column("chat_messages", "grounding")
