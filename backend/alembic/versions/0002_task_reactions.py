"""task reactions

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "task_reactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("emoji", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("task_id", "user_id", "emoji", name="uq_task_reactions_task_user_emoji"),
    )
    op.create_index("ix_task_reactions_task_id", "task_reactions", ["task_id"])
    op.create_index("ix_task_reactions_user_id", "task_reactions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_task_reactions_user_id", table_name="task_reactions")
    op.drop_index("ix_task_reactions_task_id", table_name="task_reactions")
    op.drop_table("task_reactions")
