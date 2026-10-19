import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, token, type TokenResponse, type User } from "./api";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => token.get() !== null);

  useEffect(() => {
    if (!token.get()) return;
    let cancelled = false;
    api
      .get<User>("/auth/me")
      .then((u) => !cancelled && setUser(u))
      .catch(() => {
        token.clear();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = useCallback(async (t: TokenResponse) => {
    token.set(t.access_token);
    setUser(await api.get<User>("/auth/me"));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => finish(await api.post<TokenResponse>("/auth/login", { email, password })),
    [finish],
  );
  const register = useCallback(
    async (email: string, password: string, name: string) =>
      finish(await api.post<TokenResponse>("/auth/register", { email, password, name })),
    [finish],
  );
  const logout = useCallback(() => {
    token.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
