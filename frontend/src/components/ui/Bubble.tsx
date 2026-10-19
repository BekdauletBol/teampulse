import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export type BubbleTone = "blue" | "gray" | "error" | "success";
type Props = {
  children: ReactNode;
  tone?: BubbleTone;
  tail?: "left" | "right" | "none";
  size?: "sm" | "md";
  className?: string;
  role?: string;
  id?: string;
};

const tones: Record<BubbleTone, string> = {
  blue: "bg-bubble text-bubble-ink",
  gray: "bg-todo text-todo-ink",
  error: "bg-danger-soft text-danger",
  success: "bg-done text-done-ink",
};

/** iMessage-style bubble used for hints, empty states, toasts and errors. */
export function Bubble({ children, tone = "blue", tail = "left", size = "md", className, role, id }: Props) {
  return (
    <div
      id={id}
      role={role}
      className={cn(
        "relative inline-block max-w-prose rounded-2xl leading-snug",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-[15px]",
        tones[tone],
        tail === "left" && "bubble-tail-left rounded-bl-md",
        tail === "right" && "bubble-tail-right rounded-br-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
