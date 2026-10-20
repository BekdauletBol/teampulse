/** Task colour palette. Must match TASK_COLORS in backend/app/schemas/task.py. */
export const TASK_COLORS = [
  { hex: "#4F7BFF", name: "blue" },
  { hex: "#F472B6", name: "pink" },
  { hex: "#FB923C", name: "orange" },
  { hex: "#FACC15", name: "yellow" },
  { hex: "#34D399", name: "green" },
  { hex: "#A78BFA", name: "purple" },
  { hex: "#F87171", name: "red" },
  { hex: "#94A3B8", name: "gray" },
] as const;

export type TaskColor = (typeof TASK_COLORS)[number]["hex"];

export function colorName(hex: string | null | undefined): string {
  if (!hex) return "none";
  return TASK_COLORS.find((c) => c.hex === hex.toUpperCase())?.name ?? hex;
}

/**
 * Card styles for a task colour: a 4px left border plus a faint tint mixed into the
 * surface. The tint strength is a theme token (--task-tint) so dark mode can go a
 * touch stronger without the light theme looking washed.
 */
export function taskColorStyle(hex: string | null | undefined): React.CSSProperties | undefined {
  if (!hex) return undefined;
  return {
    borderLeftColor: hex,
    borderLeftWidth: 4,
    backgroundColor: `color-mix(in srgb, ${hex} var(--task-tint), var(--surface))`,
  };
}
