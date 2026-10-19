import { cn } from "../../lib/cn";

const HUES = [210, 260, 330, 20, 150, 45, 190];

function hueFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) | 0;
  return HUES[Math.abs(h) % HUES.length];
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = { name: string; size?: "sm" | "md" | "lg"; className?: string; title?: string };
const sizes = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };

/** Initials circle with a stable pastel hue per name. */
export function Avatar({ name, size = "md", className, title }: Props) {
  const hue = hueFor(name);
  return (
    <span
      title={title ?? name}
      aria-label={name}
      role="img"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-2 ring-surface",
        sizes[size],
        className,
      )}
      style={{ background: `hsl(${hue} 85% 90%)`, color: `hsl(${hue} 45% 30%)` }}
    >
      {initialsOf(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 4, size = "sm" }: { names: string[]; max?: number; size?: Props["size"] }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className="flex -space-x-2">
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-todo font-semibold text-todo-ink ring-2 ring-surface",
            sizes[size ?? "sm"],
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
