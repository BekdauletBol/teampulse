import { deadlineLabel, urgencyOf, type Urgency } from "../../lib/dates";
import { cn } from "../../lib/cn";
import { useVibe } from "../../lib/vibe";

const STYLES: Record<Urgency, { className: string; emoji: string }> = {
  overdue: { className: "bg-danger-soft text-danger", emoji: "🔥" },
  soon: { className: "bg-progress text-progress-ink", emoji: "⏰" },
  later: { className: "bg-todo text-todo-ink", emoji: "📅" },
};

/** Deadline pill: red tint when overdue, amber when due today/tomorrow, neutral otherwise. */
export function DeadlineChip({ iso, now, done, className }: { iso: string; now?: Date; done?: boolean; className?: string }) {
  const { vibe } = useVibe();
  const urgency = urgencyOf(iso, now);
  if (vibe && !done && urgency === "overdue") {
    return (
      <span
        role="img"
        aria-label="overdue. it's giving procrastination"
        title="it's giving procrastination"
        className={cn("inline-flex min-h-[26px] items-center rounded-full px-2.5 text-base leading-none", STYLES.overdue.className, className)}
      >
        🫠
      </span>
    );
  }
  // a finished task has no urgency left: keep the date, drop the colour
  const s = done ? { className: "bg-todo text-todo-ink", emoji: "✅" } : STYLES[urgency];
  return (
    <span
      className={cn("inline-flex min-h-[26px] items-center gap-1 rounded-full px-2.5 text-xs font-medium", s.className, className)}
      title={`deadline ${iso}`}
    >
      <span aria-hidden>{s.emoji}</span>
      {done ? deadlineLabel(iso, now).replace(/^overdue · /, "") : deadlineLabel(iso, now)}
    </span>
  );
}
