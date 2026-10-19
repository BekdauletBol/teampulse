const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";
const TOKEN_KEY = "tp.token";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

export const token = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (value: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, value);
    } catch {
      /* private mode etc. */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const t = token.get();
  if (t) headers.Authorization = `Bearer ${t}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "can't reach the server right now");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new ApiError(res.status, extractDetail(data, res.status));
  }
  return data as T;
}

function extractDetail(data: unknown, status: number): string {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d.length && typeof d[0] === "object" && d[0] && "msg" in d[0]) {
      return String((d[0] as { msg: unknown }).msg).replace(/^Value error, /, "");
    }
  }
  return `request failed (${status})`;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
};

/* ---------- API types (mirror backend schemas) ---------- */
export type User = { id: number; email: string; name: string; created_at: string };
export type TokenResponse = { access_token: string; token_type: string };
export type Team = { id: number; name: string; owner_id: number; created_at: string };
export type TeamMember = { user_id: number; email: string; name: string; role: "owner" | "member"; joined_at: string };
export type TeamDetail = Team & { members: TeamMember[] };
export type TeamInvitePreview = { id: number; name: string; member_count: number; already_member: boolean };
export type InviteLink = { invite_token: string; invite_url: string };
export type TaskStatus = "todo" | "in_progress" | "done";
export type Reaction = { emoji: string; count: number; reacted_by_me: boolean };
export type Task = {
  id: number;
  team_id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  assignee_id: number | null;
  status: TaskStatus;
  created_by: number;
  created_at: string;
  updated_at: string;
  reactions: Reaction[];
};
