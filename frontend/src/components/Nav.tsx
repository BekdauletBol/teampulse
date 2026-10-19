import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/cn";
import { pop } from "../lib/motion";
import { useTheme } from "../lib/theme";
import { Avatar, ButtonLink, EmojiBurst, Switch, useToast } from "./ui";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex min-h-[44px] items-center rounded-full px-3 text-[15px] transition-colors",
    isActive ? "text-ink" : "text-muted hover:text-ink",
  );

export function Nav() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onLogout = () => {
    setOpen(false);
    logout();
    toast.show("see you soon", { emoji: "👋" });
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="main">
        <EmojiBurst emojis={["💙", "✨", "📌"]} inline>
          <Link to={user ? "/teams" : "/"} className="font-display text-[28px] lowercase leading-none tracking-tight">
            teampulse
          </Link>
        </EmojiBurst>

        <div className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <EmojiBurst emojis={["🧑‍🤝‍🧑", "📋", "🗂️"]} inline className="hidden sm:inline-block">
                <NavLink to="/teams" className={linkClass}>
                  teams
                </NavLink>
              </EmojiBurst>
              <div ref={menuRef} className="relative">
                <button
                  aria-haspopup="menu"
                  aria-expanded={open}
                  onClick={() => setOpen((o) => !o)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full"
                >
                  <Avatar name={user.name} />
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      role="menu"
                      variants={pop}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-line bg-surface-2 p-2 shadow-lift"
                    >
                      <div className="px-3 py-2">
                        <div className="truncate text-sm font-medium">{user.name}</div>
                        <div className="truncate text-xs text-muted">{user.email}</div>
                      </div>
                      <div className="my-1 h-px bg-line" />
                      <MenuLink to="/teams" onClick={() => setOpen(false)} className="sm:hidden">
                        teams
                      </MenuLink>
                      <MenuLink to="/design" onClick={() => setOpen(false)}>
                        design system
                      </MenuLink>
                      <div className="flex min-h-[44px] items-center justify-between rounded-xl px-3 text-[15px]">
                        <span>
                          <span aria-hidden className="mr-1.5">
                            {theme === "light" ? "☀️" : "🌙"}
                          </span>
                          light mode
                        </span>
                        <Switch checked={theme === "light"} onChange={(on) => setTheme(on ? "light" : "dark")} label="light mode" />
                      </div>
                      <div className="my-1 h-px bg-line" />
                      <button
                        role="menuitem"
                        onClick={onLogout}
                        className="flex min-h-[44px] w-full items-center rounded-xl px-3 text-left text-[15px] text-danger hover:bg-danger-soft"
                      >
                        log out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>
                log in
              </NavLink>
              <EmojiBurst emojis={["✨", "🚀", "🙌"]} inline>
                <ButtonLink to="/register" size="sm">
                  get started
                </ButtonLink>
              </EmojiBurst>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function MenuLink({ to, children, onClick, className }: { to: string; children: string; onClick: () => void; className?: string }) {
  return (
    <Link
      role="menuitem"
      to={to}
      onClick={onClick}
      className={cn("flex min-h-[44px] items-center rounded-xl px-3 text-[15px] hover:bg-bubble/60", className)}
    >
      {children}
    </Link>
  );
}
