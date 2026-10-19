import { AnimatePresence, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Skeleton, SkeletonText, ToastProvider } from "./components/ui";
import { AuthProvider, useAuth } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";
import AuthForm from "./pages/AuthForm";
import Design from "./pages/Design";
import Landing from "./pages/Landing";
import Join from "./pages/Join";
import TeamPage from "./pages/TeamPage";
import Teams from "./pages/Teams";

function Guard({ children, requireAuth }: { children: ReactNode; requireAuth: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageSkeleton />;
  if (requireAuth && !user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!requireAuth && user) {
    // Honour the page the user was heading to (e.g. an invite link) instead of always going to /teams.
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from.startsWith("/") ? from : "/teams"} replace />;
  }
  return <>{children}</>;
}

/** Shown while the stored session is being restored; shaped like a generic page header + cards. */
function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12" aria-busy="true" aria-label="loading">
      <Skeleton className="h-12 w-56 sm:w-72" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <Skeleton className="h-8 w-2/3" />
            <div className="mt-6 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((j) => (
                  <Skeleton key={j} className="h-7 w-7 rounded-full" />
                ))}
              </div>
              <SkeletonText lines={1} className="w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Guard requireAuth={false}><Landing /></Guard>} />
        <Route path="/login" element={<Guard requireAuth={false}><AuthForm mode="login" /></Guard>} />
        <Route path="/register" element={<Guard requireAuth={false}><AuthForm mode="register" /></Guard>} />
        <Route path="/teams" element={<Guard requireAuth><Teams /></Guard>} />
        <Route path="/teams/:teamId" element={<Guard requireAuth><TeamPage /></Guard>} />
        <Route path="/join/:token" element={<Guard requireAuth><Join /></Guard>} />
        <Route path="/design" element={<Design />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <Nav />
              <main>
                <AnimatedRoutes />
              </main>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </MotionConfig>
  );
}
