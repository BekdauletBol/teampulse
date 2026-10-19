import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { TaskStatus } from "./api";

type Ctx = { vibe: boolean; setVibe: (on: boolean) => void };
const VibeContext = createContext<Ctx>({ vibe: false, setVibe: () => {} });

const NORMAL: Record<TaskStatus, string> = { todo: "to do", in_progress: "in progress", done: "done" };
const VIBE: Record<TaskStatus, string> = { todo: "not my problem yet", in_progress: "locked in", done: "ate" };

export function statusLabel(status: TaskStatus, vibe: boolean): string {
  return (vibe ? VIBE : NORMAL)[status];
}

/** Per-user "vibe mode" preference. Default off so the board reads standard. */
export function VibeProvider({ userId, children }: { userId: number; children: ReactNode }) {
  const key = `tp.vibe.${userId}`;
  const [vibe, setState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });
  const setVibe = useCallback(
    (on: boolean) => {
      setState(on);
      try {
        localStorage.setItem(key, on ? "1" : "0");
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  const value = useMemo(() => ({ vibe, setVibe }), [vibe, setVibe]);
  return <VibeContext.Provider value={value}>{children}</VibeContext.Provider>;
}

export const useVibe = () => useContext(VibeContext);
