import type { TaskStatus } from "../../lib/api";
import { cn } from "../../lib/cn";

export const STATUS_META: Record<TaskStatus, { label: string; className: string; emoji: string }> = {
  todo: { label: "to do", className: "bg-todo text-todo-ink", emoji: "📝" },
  in_progress: { label: "in progress", className: "bg-progress text-progress-ink", emoji: "🔧" },
  done: { label: "done", className: "bg-done text-done-ink", emoji: "✅" },
};

export function StatusPill({ status, className }: { status: TaskStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex min-h-[28px] items-center gap-1 rounded-full px-3 text-xs font-medium",
        m.className,
        className,
      )}
    >
      <span aria-hidden>{m.emoji}</span>
      {m.label}
    </span>
  );
}
