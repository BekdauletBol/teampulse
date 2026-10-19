import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Bubble, type BubbleTone } from "./Bubble";

type Toast = { id: number; text: string; emoji?: string; tone: BubbleTone };
type Ctx = { show: (text: string, opts?: { emoji?: string; tone?: BubbleTone }) => void };

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const show = useCallback<Ctx["show"]>((text, opts) => {
    const id = seq.current++;
    setToasts((t) => [...t, { id, text, emoji: opts?.emoji, tone: opts?.tone ?? "blue" }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <Bubble tone={t.tone} tail="right" role="status" className="shadow-soft">
                {t.emoji && (
                  <span aria-hidden className="mr-1.5">
                    {t.emoji}
                  </span>
                )}
                {t.text}
              </Bubble>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
