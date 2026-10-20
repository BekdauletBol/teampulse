import { cn } from "../../lib/cn";
import { TASK_COLORS } from "../../lib/colors";
import type { Task } from "../../lib/api";

/** "all", "none" (uncoloured tasks) or a palette hex. */
export type ColorFilterValue = "all" | "none" | string;

export function matchesColorFilter(task: Task, filter: ColorFilterValue): boolean {
  if (filter === "all") return true;
  if (filter === "none") return !task.color;
  return task.color?.toUpperCase() === filter;
}

/**
 * Client-side filter chips. Only colours actually used on the board are offered,
 * plus "no color" when some tasks have none; hidden entirely when nothing is coloured.
 */
export function ColorFilter({ tasks, value, onChange }: { tasks: Task[]; value: ColorFilterValue; onChange: (v: ColorFilterValue) => void }) {
  const used = new Set(tasks.map((t) => t.color?.toUpperCase()).filter(Boolean));
  const hasUncolored = tasks.some((t) => !t.color);
  const colors = TASK_COLORS.filter((c) => used.has(c.hex));
  if (colors.length === 0) return null;

  const count = (v: ColorFilterValue) => tasks.filter((t) => matchesColorFilter(t, v)).length;

  return (
    <div role="radiogroup" aria-label="filter by color" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      <Chip selected={value === "all"} onClick={() => onChange("all")} label="all" count={tasks.length} />
      {colors.map((c) => (
        <Chip key={c.hex} selected={value === c.hex} onClick={() => onChange(c.hex)} label={c.name} count={count(c.hex)} dot={c.hex} />
      ))}
      {hasUncolored && <Chip selected={value === "none"} onClick={() => onChange("none")} label="no color" count={count("none")} dot={null} />}
    </div>
  );
}

function Chip({ selected, onClick, label, count, dot }: { selected: boolean; onClick: () => void; label: string; count: number; dot?: string | null }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[36px] shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors",
        selected ? "border-accent bg-bubble text-bubble-ink" : "border-line bg-surface text-muted hover:text-ink",
      )}
    >
      {dot !== undefined && (
        <span
          aria-hidden
          className={cn("h-3 w-3 rounded-full", dot === null && "border border-dashed border-muted")}
          style={dot ? { backgroundColor: dot } : undefined}
        />
      )}
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}
