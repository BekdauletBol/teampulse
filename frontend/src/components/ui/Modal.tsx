import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { pop, spring } from "../../lib/motion";
import { useMediaQuery } from "../../lib/useMediaQuery";

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: "md" | "lg" };

/** Slides up from the bottom edge on small screens. */
const sheet: Variants = {
  initial: { opacity: 0, y: 48 },
  animate: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: 32, transition: { duration: 0.15 } },
};

/** Modal on desktop, bottom sheet on mobile. */
export function Modal({ open, onClose, title, children, size = "md" }: Props) {
  const desktop = useMediaQuery("(min-width: 640px)");
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <button aria-label="close" className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={
              "relative w-full border border-line bg-surface-2 p-6 shadow-lift " +
              "max-h-[92dvh] overflow-y-auto rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))] " +
              "sm:rounded-2xl sm:pb-6 " +
              (size === "lg" ? "sm:max-w-lg" : "sm:max-w-md")
            }
            variants={desktop ? pop : sheet}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div aria-hidden className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line sm:hidden" />
            <h2 id="modal-title" className="font-display text-3xl lowercase leading-none">
              {title}
            </h2>
            <div className="mt-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
