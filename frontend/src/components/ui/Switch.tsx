import { motion } from "framer-motion";
import { spring } from "../../lib/motion";
import { cn } from "../../lib/cn";

type Props = { checked: boolean; onChange: (next: boolean) => void; label: string; className?: string };

/** iOS-style switch, 44px tap target. */
export function Switch({ checked, onChange, label, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("flex min-h-[44px] items-center", className)}
    >
      <span
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-line p-0.5 transition-colors",
          checked ? "bg-accent" : "bg-todo",
        )}
      >
        <motion.span
          layout
          transition={spring}
          className="block h-5 w-5 rounded-full bg-white shadow-soft"
          style={{ marginLeft: checked ? "auto" : 0 }}
        />
      </span>
    </button>
  );
}
