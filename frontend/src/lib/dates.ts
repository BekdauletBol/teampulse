/** Deadline helpers. Deadlines are ISO dates (YYYY-MM-DD), compared in local time. */

export type Urgency = "overdue" | "soon" | "later";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** overdue: before today · soon: today or tomorrow (within ~24h) · later: anything else */
export function urgencyOf(iso: string, now = new Date()): Urgency {
  const today = startOfDay(now).getTime();
  const due = startOfDay(parseISODate(iso)).getTime();
  const dayMs = 86_400_000;
  if (due < today) return "overdue";
  if (due - today <= dayMs) return "soon";
  return "later";
}

export function deadlineLabel(iso: string, now = new Date()): string {
  const today = startOfDay(now).getTime();
  const due = startOfDay(parseISODate(iso)).getTime();
  const diffDays = Math.round((due - today) / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  const d = parseISODate(iso);
  const short = d.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toLowerCase();
  return diffDays < 0 ? `overdue · ${short}` : short;
}
