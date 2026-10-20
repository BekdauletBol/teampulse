import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { TASK_COLORS } from "../../lib/colors";
import { spring } from "../../lib/motion";
import { useEmojiBurst } from "../ui";

type Props = {
  value: string | null;
  onChange: (hex: string | null) => void;
  label?: string;
};

/** Row of 8 palette swatches plus a dashed "none" swatch. Radio-group semantics. */
export function ColorSwatches({ value, onChange, label = "color" }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium" id="color-swatches-label">
        {label} <span className="font-normal text-muted">(optional)</span>
      </span>
      <div role="radiogroup" aria-labelledby="color-swatches-label" className="flex flex-wrap items-center gap-1.5">
        <Swatch hex={null} name="none" selected={value === null} onSelect={() => onChange(null)} />
        {TASK_COLORS.map((c) => (
          <Swatch key={c.hex} hex={c.hex} name={c.name} selected={value?.toUpperCase() === c.hex} onSelect={() => onChange(c.hex)} />
        ))}
      </div>
    </div>
  );
}

function Swatch({ hex, name, selected, onSelect }: { hex: string | null; name: string; selected: boolean; onSelect: () => void }) {
  const burst = useEmojiBurst(["🎨"]);
  return (
    <span className="relative inline-flex" {...burst.handlers}>
      <motion.button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={name}
        title={name}
        onClick={onSelect}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        transition={spring}
        // 44px tap target around a 28px dot
        className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none"
      >
        <span
          className={cn(
            "block h-7 w-7 rounded-full transition-shadow",
            hex === null && "border-2 border-dashed border-muted/60",
            selected ? "ring-2 ring-ink ring-offset-2 ring-offset-surface-2" : "ring-0",
          )}
          style={hex ? { backgroundColor: hex } : undefined}
        />
      </motion.button>
      {burst.layer}
    </span>
  );
}
