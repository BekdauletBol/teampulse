import type { Transition, Variants } from "framer-motion";

/** Spring used for hover lifts and modals. */
export const spring: Transition = { type: "spring", stiffness: 420, damping: 28, mass: 0.6 };

/** Card: lift 4px on hover. */
export const lift = { whileHover: { y: -4 }, transition: spring } as const;

/** Buttons: 0.97 scale on press. */
export const press = { whileTap: { scale: 0.97 }, transition: spring } as const;

/** Page transition: fade + 8px slide. */
export const page: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: "easeIn" } },
};

/** Modal/dropdown pop. */
export const pop: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.12 } },
};

export const rand = (min: number, max: number) => Math.random() * (max - min) + min;
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Deterministic tilt in [-6, 6] from a string so stickers don't jump between renders. */
export function tiltFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 1200) / 100) - 6;
}
