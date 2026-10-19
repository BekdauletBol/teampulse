import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Bubble, Button, Card, EmojiBurst, Input, PageTransition, Sticker, useToast } from "../components/ui";

type Mode = "login" | "register";
type Errors = { email?: string; password?: string; name?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(mode: Mode, v: { email: string; password: string; name: string }): Errors {
  const e: Errors = {};
  if (!v.email.trim()) e.email = "we'll need your email";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "that doesn't look like an email";
  if (!v.password) e.password = "and a password";
  else if (mode === "register" && v.password.length < 8) e.password = "make it at least 8 characters";
  if (mode === "register" && !v.name.trim()) e.name = "what should we call you?";
  return e;
}

function friendly(err: unknown, mode: Mode): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return "that email's already taken. try logging in?";
    if (err.status === 401) return "hmm, that email or password doesn't match.";
    if (err.status === 0) return "can't reach the server. is the backend running?";
    return err.detail;
  }
  return mode === "login" ? "couldn't log you in just now." : "couldn't create your account just now.";
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [values, setValues] = useState({ email: "", password: "", name: "" });
  const [touched, setTouched] = useState<Record<keyof Errors, boolean>>({ email: false, password: false, name: false });
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const errors = validate(mode, values);
  const showErr = (k: keyof Errors) => (touched[k] || submitted ? errors[k] : undefined);
  const from = (location.state as { from?: string } | null)?.from ?? "/teams";

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setApiError(null);
  };
  const blur = (k: keyof Errors) => () => setTouched((t) => ({ ...t, [k]: true }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    setBusy(true);
    setApiError(null);
    try {
      if (mode === "login") {
        await login(values.email.trim(), values.password);
        toast.show("welcome back", { emoji: "👋" });
      } else {
        await register(values.email.trim(), values.password, values.name.trim());
        toast.show("you're in", { emoji: "🎉" });
      }
      navigate(from, { replace: true });
    } catch (err) {
      setApiError(friendly(err, mode));
    } finally {
      setBusy(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <PageTransition className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <div className="mb-6 flex justify-center">
        <Sticker size="lg" seed={mode}>
          {isLogin ? "👋" : "🎒"}
        </Sticker>
      </div>
      <Card padding="lg">
        <h1 className="font-display text-4xl lowercase leading-none sm:text-5xl">{isLogin ? "welcome back" : "make an account"}</h1>
        <p className="mt-2 text-[15px] text-muted">
          {isLogin ? "log in to see your boards." : "takes about twenty seconds."}
        </p>

        <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          {!isLogin && (
            <Input label="name" autoComplete="name" placeholder="sam" value={values.name} onChange={set("name")} onBlur={blur("name")} error={showErr("name")} />
          )}
          <Input
            label="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@uni.edu"
            value={values.email}
            onChange={set("email")}
            onBlur={blur("email")}
            error={showErr("email")}
          />
          <Input
            label="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder={isLogin ? "••••••••" : "8+ characters"}
            value={values.password}
            onChange={set("password")}
            onBlur={blur("password")}
            error={showErr("password")}
            hint={!isLogin ? "8 characters or more" : undefined}
          />

          {apiError && (
            <Bubble tone="error" tail="left" role="alert">
              {apiError}
            </Bubble>
          )}

          <EmojiBurst emojis={isLogin ? ["🔑", "👋", "✨"] : ["🎉", "🚀", "✨"]} className="mt-2">
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              {isLogin ? "log in" : "create account"}
            </Button>
          </EmojiBurst>
        </form>
      </Card>

      <p className="mt-6 text-center text-[15px] text-muted">
        {isLogin ? "new here? " : "already have an account? "}
        <Link to={isLogin ? "/register" : "/login"} state={{ from }} className="font-medium text-accent underline-offset-4 hover:underline">
          {isLogin ? "make an account" : "log in"}
        </Link>
      </p>
    </PageTransition>
  );
}
