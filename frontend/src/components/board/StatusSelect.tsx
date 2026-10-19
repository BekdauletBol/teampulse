import type { TaskStatus } from "../../lib/api";
import { cn } from "../../lib/cn";
import { statusLabel, useVibe } from "../../lib/vibe";
import { STATUS_META } from "../ui/StatusPill";

const ORDER: TaskStatus[] = ["todo", "in_progress", "done"];

/** Keyboard/touch fallback for drag-and-drop: a native select styled as a status pill. */
export function StatusSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: TaskStatus;
  onChange: (next: TaskStatus) => void;
  disabled?: boolean;
  className?: string;
}) {
  const m = STATUS_META[value];
  const { vibe } = useVibe();
  return (
    <span className={cn("relative inline-flex", className)}>
      <select
        aria-label="status"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as TaskStatus)}
        className={cn(
          "min-h-[28px] cursor-pointer appearance-none rounded-full border-0 py-0 pl-3 pr-7 text-xs font-medium",
          "focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60",
          m.className,
        )}
      >
        {ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].emoji} {statusLabel(s, vibe)}
          </option>
        ))}
      </select>
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 fill-current opacity-70">
        <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
