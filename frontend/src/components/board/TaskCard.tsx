import { useEffect, useRef, useState } from "react";
import type { Task, TaskStatus, TeamMember } from "../../lib/api";
import { cn } from "../../lib/cn";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { Avatar, Card, useEmojiBurst } from "../ui";
import { DeadlineChip } from "./DeadlineChip";
import { ReactionPicker } from "./ReactionPicker";
import { StatusSelect } from "./StatusSelect";

export const STATUS_BURST: Record<TaskStatus, string[]> = {
  todo: ["📝", "✨", "🗒️"],
  in_progress: ["🔧", "🔥", "⏳"],
  done: ["✅", "🎉", "🙌"],
};

const LONG_PRESS_MS = 420;

type Props = {
  task: Task;
  assignee?: TeamMember;
  dragging?: boolean;
  busy?: boolean;
  onStatusChange: (status: TaskStatus) => void;
  onReact: (emoji: string) => void;
};

export function TaskCard({ task, assignee, dragging, busy, onStatusChange, onReact }: Props) {
  const canHover = useMediaQuery("(hover: hover)");
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false); // long-press (touch) opened the picker
  const timer = useRef<number | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);
  const burst = useEmojiBurst(STATUS_BURST[task.status]);

  const pickerOpen = !dragging && (pressed || (canHover && hover));
  const mine = new Set(task.reactions.filter((r) => r.reacted_by_me).map((r) => r.emoji));

  // long-press on touch devices
  const startPress = () => {
    if (canHover) return;
    timer.current = window.setTimeout(() => {
      setPressed(true);
      navigator.vibrate?.(8);
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => window.clearTimeout(timer.current);

  // tap outside closes a long-press picker
  useEffect(() => {
    if (!pressed) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPressed(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [pressed]);

  const pick = (emoji: string) => {
    onReact(emoji);
    burst.burst(true, [emoji]);
    setPressed(false);
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => {
        setHover(true);
        burst.burst();
      }}
      onMouseLeave={() => setHover(false)}
      onFocus={() => burst.burst()}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onTouchCancel={cancelPress}
      onContextMenu={(e) => !canHover && e.preventDefault()}
    >
      <ReactionPicker open={pickerOpen} onPick={pick} mine={mine} />
      <Card
        hover={!dragging}
        padding="none"
        className={cn(
          "p-4",
          dragging && "shadow-lift ring-2 ring-accent/50",
          busy && "opacity-70",
          task.status === "done" && "opacity-90",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className={cn("text-[15px] font-medium leading-snug", task.status === "done" && "line-through decoration-muted/60")}>
            {task.title}
          </h3>
          {assignee ? (
            <Avatar name={assignee.name} size="sm" title={assignee.name} />
          ) : (
            <span
              aria-label="unassigned"
              title="unassigned"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-line text-muted"
            >
              ·
            </span>
          )}
        </div>
        {task.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{task.description}</p>}
        <div className="mt-3 flex items-center justify-between gap-2">
          {task.deadline ? <DeadlineChip iso={task.deadline} done={task.status === "done"} /> : <span className="text-xs text-muted">no deadline</span>}
          <StatusSelect value={task.status} onChange={onStatusChange} disabled={busy} />
        </div>
        {task.reactions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label="reactions">
            {task.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                aria-pressed={r.reacted_by_me}
                aria-label={`${r.emoji} ${r.count}${r.reacted_by_me ? ", you reacted" : ""}`}
                onClick={() => pick(r.emoji)}
                className={cn(
                  "inline-flex min-h-[26px] items-center gap-1 rounded-full px-2 text-xs font-medium tabular-nums transition-colors",
                  r.reacted_by_me ? "bg-bubble text-bubble-ink ring-1 ring-accent/60" : "bg-todo text-todo-ink hover:ring-1 hover:ring-line",
                )}
              >
                <span aria-hidden>{r.emoji}</span>
                {r.count}
              </button>
            ))}
          </div>
        )}
      </Card>
      {burst.layer}
    </div>
  );
}
