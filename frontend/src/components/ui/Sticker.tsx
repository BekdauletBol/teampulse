import { cn } from "../../lib/cn";
import { tiltFor } from "../../lib/motion";

type Props = {
  /** An emoji, or any node (e.g. <img>). */
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Override the deterministic tilt (degrees). */
  tilt?: number;
  /** Seed for the deterministic random tilt (-6..6). Defaults to the emoji text. */
  seed?: string;
  float?: boolean;
  /** Animation delay for `float`, e.g. "-1.2s" to desync several stickers. */
  delay?: string;
  className?: string;
  label?: string;
};

const sizes = { sm: "text-3xl", md: "text-5xl", lg: "text-7xl", xl: "text-8xl sm:text-9xl" };

/** Emoji/illustration with a thick white outline and a slight random rotation. */
export function Sticker({ children, size = "md", tilt, seed, float, delay, className, label }: Props) {
  const rot = tilt ?? tiltFor(seed ?? String(children));
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("inline-block select-none leading-none sticker-outline", sizes[size], float && "animate-float", className)}
      style={{ transform: `rotate(${rot}deg)`, ["--rot" as string]: `${rot}deg`, animationDelay: delay }}
    >
      {children}
    </span>
  );
}
