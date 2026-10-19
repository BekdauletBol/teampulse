import { AnimatePresence, motion } from "framer-motion";
import { spring } from "../../lib/motion";

export const REACTIONS = ["🔥", "❤️", "💀", "😭", "👀"] as const;

type Props = { open: boolean; onPick: (emoji: string) => void; mine: Set<string> };

/** Floating pill above a card. Parent must be `relative`. */
export function ReactionPicker({ open, onPick, mine }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="toolbar"
          aria-label="react"
          initial={{ opacity: 0, y: 6, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: spring }}
          exit={{ opacity: 0, y: 4, scale: 0.96, transition: { duration: 0.12 } }}
          className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-[calc(100%+6px)] items-center gap-0.5 rounded-full border border-line bg-surface-2 p-1 shadow-lift"
          onMouseDown={(e) => e.preventDefault()} // keep focus/selection where it was
        >
          {REACTIONS.map((emoji) => (
            <motion.button
              key={emoji}
              type="button"
              aria-label={`react ${emoji}`}
              aria-pressed={mine.has(emoji)}
              onClick={() => onPick(emoji)}
              whileHover={{ scale: 1.25, y: -2 }}
              whileTap={{ scale: 0.9 }}
              transition={spring}
              className={
                "flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none " +
                (mine.has(emoji) ? "bg-bubble" : "hover:bg-bubble/50")
              }
            >
              {emoji}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
