import confetti from "canvas-confetti";
import { pick } from "./motion";

/** Short, lowercase, no exclamation spam. */
export const DONE_PHRASES = [
  "slay",
  "ate that",
  "one less thing to cry about",
  "locked in fr",
  "certified doer",
  "it's giving productive",
  "no notes",
  "main character energy",
  "understood the assignment",
  "we love to see it",
  "that's a wrap",
  "off the list, off the mind",
  "lowkey impressive",
  "big done energy",
  "chef's kiss",
  "another one bites the dust",
  "iconic behaviour",
  "the group chat will hear about this",
  "and just like that",
  "you ate and left no crumbs",
];

export const donePhrase = () => pick(DONE_PHRASES);

/**
 * Confetti from an element's centre. canvas-confetti honours prefers-reduced-motion
 * via disableForReducedMotion, so this is a no-op for those users.
 */
export function confettiFrom(el: Element | null) {
  let origin = { x: 0.5, y: 0.5 };
  if (el) {
    const r = el.getBoundingClientRect();
    origin = {
      x: (r.left + r.width / 2) / window.innerWidth,
      y: (r.top + r.height / 2) / window.innerHeight,
    };
  }
  void confetti({
    particleCount: 70,
    spread: 65,
    startVelocity: 32,
    gravity: 1.1,
    ticks: 160,
    scalar: 0.9,
    origin,
    colors: ["#4F7BFF", "#7FA3FF", "#BBF7D0", "#FDE68A", "#FFFFFF"],
    disableForReducedMotion: true,
    zIndex: 70,
  });
}
