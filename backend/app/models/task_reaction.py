from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

ALLOWED_REACTIONS: tuple[str, ...] = ("🔥", "❤️", "💀", "😭", "👀")


class TaskReaction(Base):
    __tablename__ = "task_reactions"
    __table_args__ = (
        UniqueConstraint("task_id", "user_id", "emoji", name="uq_task_reactions_task_user_emoji"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    emoji: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    task: Mapped["Task"] = relationship(back_populates="reactions")  # noqa: F821
    user: Mapped["User"] = relationship()  # noqa: F821
