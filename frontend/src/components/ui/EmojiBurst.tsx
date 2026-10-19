import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { pick, rand } from "../../lib/motion";

type Particle = {
  id: number;
  emoji: string;
  ox: number; // origin x, % of element width
  oy: number; // origin y, % of element height
  dx: number; // drift x (px)
  dy: number; // rise y (px, negative = up)
  rot: number;
  size: number;
  delay: number;
};

const COOLDOWN_MS = 650;
const LIFETIME_MS = 1000;

export type BurstOptions = {
  /** Bigger celebration: ~3x particles, larger, flies higher. For submit moments. */
  big?: boolean;
  /** Don't burst on hover/focus; only when `burst()` is called. */
  manual?: boolean;
};

/**
 * useEmojiBurst — returns handlers to spread on any element plus a `layer` node to
 * render inside it (the element needs `position: relative`). Respects reduced motion.
 * `burst(force, override)` fires imperatively; `force` skips the cooldown and
 * `override` replaces the emoji set for that one burst.
 */
export function useEmojiBurst(emojis: readonly string[], opts: BurstOptions = {}) {
  const reduce = useReducedMotion();
  const [particles, setParticles] = useState<Particle[]>([]);
  const seq = useRef(0);
  const last = useRef(0);
  const { big = false, manual = false } = opts;

  const burst = useCallback(
    (force = false, override?: readonly string[]) => {
      const set = override ?? emojis;
      if (reduce || set.length === 0) return;
      const now = performance.now();
      if (!force && now - last.current < COOLDOWN_MS) return;
      last.current = now;

      const count = big ? 16 + Math.floor(Math.random() * 6) : 5 + Math.floor(Math.random() * 5); // 16..21 | 5..9
      const batch: Particle[] = Array.from({ length: count }, () => ({
        id: seq.current++,
        emoji: pick(set),
        ox: rand(big ? 10 : 20, big ? 90 : 80),
        oy: rand(30, 70),
        dx: rand(big ? -110 : -44, big ? 110 : 44),
        dy: -rand(big ? 90 : 56, big ? 220 : 120),
        rot: rand(-35, 35),
        size: big ? rand(20, 34) : rand(14, 24),
        delay: rand(0, big ? 0.22 : 0.14),
      }));
      const ids = new Set(batch.map((p) => p.id));
      setParticles((prev) => [...prev, ...batch]);
      window.setTimeout(() => setParticles((prev) => prev.filter((p) => !ids.has(p.id))), LIFETIME_MS + 400);
    },
    [emojis, reduce, big],
  );

  const onHover = useCallback(() => burst(false), [burst]);
  const handlers = manual ? {} : { onMouseEnter: onHover, onFocus: onHover, onTouchStart: onHover };

  const layer = (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-visible">
      <AnimatePresence>
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.ox}%`, top: `${p.oy}%` }}
          >
            <motion.span
              className="burst-particle block select-none leading-none"
              style={{ fontSize: p.size }}
              initial={{ opacity: 0, scale: 0.3, x: 0, y: 0, rotate: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.3, 1.15, 1, 0.85],
                x: [0, p.dx * 0.6, p.dx],
                y: [0, p.dy * 0.55, p.dy],
                rotate: [0, p.rot],
              }}
              transition={{ duration: big ? 1.15 : 0.9, delay: p.delay, ease: "easeOut", times: [0, 0.25, 0.7, 1] }}
            >
              {p.emoji}
            </motion.span>
          </span>
        ))}
      </AnimatePresence>
    </span>
  );

  return { handlers, layer, burst };
}

type Props = BurstOptions & {
  emojis: readonly string[];
  children: ReactNode;
  className?: string;
  /** Render as an inline wrapper (for buttons/links inside text). */
  inline?: boolean;
};

/** <EmojiBurst emojis={["✨","🤝"]}>…</EmojiBurst> — wraps children and bursts on hover/focus. */
export function EmojiBurst({ emojis, children, className, inline, big, manual }: Props) {
  const { handlers, layer } = useEmojiBurst(emojis, { big, manual });
  const Tag = inline ? "span" : "div";
  return (
    <Tag className={cn("relative", inline ? "inline-block" : "block", className)} {...handlers}>
      {children}
      {layer}
    </Tag>
  );
}
