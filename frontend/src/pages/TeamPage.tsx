import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Board } from "../components/board/Board";
import { AddTaskModal } from "../components/board/AddTaskModal";
import {
  AvatarStack,
  Bubble,
  Button,
  ButtonLink,
  Card,
  EmojiBurst,
  Skeleton,
  SkeletonText,
  Sticker,
  Switch,
  PageTransition,
  useEmojiBurst,
  useToast,
} from "../components/ui";
import { api, ApiError, type InviteLink, type Reaction, type Task, type TaskStatus, type TeamDetail } from "../lib/api";
import { useAuth } from "../lib/auth";
import { confettiFrom, donePhrase } from "../lib/celebrate";
import { VibeProvider, useVibe } from "../lib/vibe";

/** Toggle one emoji in a reactions list the same way the backend will. */
function toggleReactionLocally(reactions: Reaction[], emoji: string): Reaction[] {
  const existing = reactions.find((r) => r.emoji === emoji);
  if (!existing) return [...reactions, { emoji, count: 1, reacted_by_me: true }];
  if (existing.reacted_by_me) {
    return existing.count <= 1
      ? reactions.filter((r) => r.emoji !== emoji)
      : reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, reacted_by_me: false } : r));
  }
  return reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, reacted_by_me: true } : r));
}

const cardEl = (taskId: number) => document.querySelector(`[data-rfd-draggable-id="${taskId}"]`);

type LoadError = { kind: "forbidden" | "missing" | "other"; message: string };

export default function TeamPage() {
  const { user } = useAuth();
  return (
    <VibeProvider userId={user?.id ?? 0}>
      <TeamPageInner />
    </VibeProvider>
  );
}

function TeamPageInner() {
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);
  const { user } = useAuth();
  const toast = useToast();
  const { vibe, setVibe } = useVibe();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const tasksRef = useRef<Task[] | null>(null);
  tasksRef.current = tasks;

  const rocket = useEmojiBurst(["🚀", "✨", "🎉"], { big: true, manual: true });
  const isOwner = !!team && !!user && team.owner_id === user.id;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [t, ts] = await Promise.all([api.get<TeamDetail>(`/teams/${teamId}`), api.get<Task[]>(`/teams/${teamId}/tasks`)]);
      setTeam(t);
      setTasks(ts);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setError({ kind: "forbidden", message: "you're not on this team." });
      else if (e instanceof ApiError && e.status === 404) setError({ kind: "missing", message: "that team doesn't exist." });
      else setError({ kind: "other", message: e instanceof ApiError ? e.detail : "couldn't load the board." });
    }
  }, [teamId]);

  useEffect(() => {
    if (Number.isNaN(teamId)) {
      setError({ kind: "missing", message: "that team doesn't exist." });
      return;
    }
    void load();
  }, [load, teamId]);

  // Prefetch the invite link for owners so the copy happens synchronously in the click (Safari needs that).
  useEffect(() => {
    if (!isOwner) return;
    api
      .get<InviteLink>(`/teams/${teamId}/invite`)
      .then((r) => setInviteUrl(r.invite_url))
      .catch(() => setInviteUrl(null));
  }, [isOwner, teamId]);

  const copyInvite = async () => {
    if (!inviteUrl) {
      toast.show("couldn't get the invite link. try again?", { tone: "error" });
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.show("link copied, send it to your team ✨");
    } catch {
      window.prompt("copy this invite link:", inviteUrl);
    }
  };

  const setBusy = (id: number, on: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  /** Optimistic status change with rollback. */
  const changeStatus = useCallback(
    async (taskId: number, status: TaskStatus) => {
      const snapshot = tasksRef.current;
      if (!snapshot) return;
      const current = snapshot.find((t) => t.id === taskId);
      if (!current || current.status === status) return;

      setTasks(snapshot.map((t) => (t.id === taskId ? { ...t, status } : t)));
      setBusy(taskId, true);
      if (status === "done") {
        // read the card's position before React moves it; confetti is a no-op under reduced motion
        confettiFrom(cardEl(taskId));
        toast.show(donePhrase(), { emoji: "🎉", tone: "success" });
      }
      try {
        const updated = await api.patch<Task>(`/teams/${teamId}/tasks/${taskId}/status`, { status });
        setTasks((prev) => prev?.map((t) => (t.id === taskId ? updated : t)) ?? prev);
      } catch (e) {
        setTasks((prev) => prev?.map((t) => (t.id === taskId ? { ...t, status: current.status } : t)) ?? prev);
        toast.show(e instanceof ApiError ? e.detail : "couldn't move that. put it back for you.", { tone: "error" });
      } finally {
        setBusy(taskId, false);
      }
    },
    [teamId, toast],
  );

  /** Optimistic reaction toggle with rollback. */
  const toggleReaction = useCallback(
    async (taskId: number, emoji: string) => {
      const snapshot = tasksRef.current;
      const current = snapshot?.find((t) => t.id === taskId);
      if (!snapshot || !current) return;
      setTasks(snapshot.map((t) => (t.id === taskId ? { ...t, reactions: toggleReactionLocally(t.reactions, emoji) } : t)));
      try {
        const updated = await api.post<Task>(`/teams/${teamId}/tasks/${taskId}/reactions`, { emoji });
        setTasks((prev) => prev?.map((t) => (t.id === taskId ? { ...t, reactions: updated.reactions } : t)) ?? prev);
      } catch (e) {
        setTasks((prev) => prev?.map((t) => (t.id === taskId ? { ...t, reactions: current.reactions } : t)) ?? prev);
        toast.show(e instanceof ApiError ? e.detail : "that reaction didn't stick. try again?", { tone: "error" });
      }
    },
    [teamId, toast],
  );

  const onCreated = (task: Task) => {
    setAddOpen(false);
    setTasks((prev) => [...(prev ?? []), task]);
    rocket.burst(true);
    toast.show("added to the board", { emoji: "📌" });
  };

  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!team || !tasks || !user) return <BoardSkeleton />;

  const openCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <PageTransition className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Link to="/teams" className="inline-flex min-h-[44px] items-center text-sm text-muted hover:text-ink">
        ← my teams
      </Link>

      <header className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="truncate font-display text-5xl lowercase leading-none sm:text-6xl">{team.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <AvatarStack names={team.members.map((m) => m.name)} max={5} />
            <span className="text-sm text-muted">
              {team.members.length} member{team.members.length === 1 ? "" : "s"}
              {tasks.length > 0 && ` · ${openCount} open`}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-1 flex min-h-[44px] items-center gap-2 text-sm text-muted">
            <span aria-hidden>{vibe ? "😮‍💨" : "📋"}</span>
            {vibe ? "vibe mode" : "normal"}
            <Switch checked={vibe} onChange={setVibe} label="vibe mode" />
          </label>
          {isOwner && (
            <EmojiBurst emojis={["🔗", "💌", "✨"]} inline>
              <Button variant="secondary" onClick={copyInvite}>
                <span aria-hidden>🔗</span> copy invite link
              </Button>
            </EmojiBurst>
          )}
          <div className="relative" {...rocket.handlers}>
            <EmojiBurst emojis={["📌", "✨"]} inline>
              <Button onClick={() => setAddOpen(true)}>+ add task</Button>
            </EmojiBurst>
            {rocket.layer}
          </div>
        </div>
      </header>

      <div className="mt-8">
        {tasks.length === 0 ? (
          <EmptyBoard onAdd={() => setAddOpen(true)} />
        ) : (
          <Board tasks={tasks} members={team.members} busyIds={busyIds} onStatusChange={changeStatus} onReact={toggleReaction} />
        )}
      </div>

      <AddTaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        teamId={team.id}
        members={team.members}
        currentUserId={user.id}
        onCreated={onCreated}
      />
    </PageTransition>
  );
}

function EmptyBoard({ onAdd }: { onAdd: () => void }) {
  return (
    <Card padding="lg" className="flex flex-col items-center gap-6 py-12 text-center sm:flex-row sm:text-left">
      <Sticker size="xl" seed="board-empty">
        🗒️
      </Sticker>
      <div className="flex flex-col items-center gap-4 sm:items-start">
        <Bubble>no tasks yet. add the first one and move it to done.</Bubble>
        <EmojiBurst emojis={["🚀", "✨", "📌"]} inline>
          <Button size="lg" onClick={onAdd}>
            add the first task
          </Button>
        </EmojiBurst>
      </div>
    </Card>
  );
}

function ErrorState({ error, onRetry }: { error: LoadError; onRetry: () => void }) {
  return (
    <PageTransition className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Card padding="lg" className="flex flex-col items-center gap-6 text-center">
        <Sticker size="xl" seed={error.kind}>
          {error.kind === "forbidden" ? "🚫" : error.kind === "missing" ? "🫥" : "😵‍💫"}
        </Sticker>
        <Bubble tone="error" role="alert">
          {error.message}
        </Bubble>
        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink to="/teams" variant="secondary">
            back to my teams
          </ButtonLink>
          {error.kind === "other" && <Button onClick={onRetry}>try again</Button>}
        </div>
      </Card>
    </PageTransition>
  );
}

function BoardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10" aria-busy="true" aria-label="loading board">
      <Skeleton className="h-4 w-20" />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-12 w-64 sm:w-80" />
          <div className="mt-3 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-7 w-7 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-40 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-full" />
        </div>
      </div>
      <div className="-mx-4 mt-8 flex gap-4 overflow-hidden px-4 md:mx-0 md:grid md:grid-cols-3 md:px-0">
        {[0, 1, 2].map((c) => (
          <div key={c} className="w-[84vw] shrink-0 rounded-2xl border border-line p-3 md:w-auto">
            <div className="flex items-center justify-between px-1 pb-3 pt-1">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-5 w-7 rounded-full" />
            </div>
            <div className="flex flex-col gap-3">
              {Array.from({ length: c === 2 ? 1 : 2 }, (_, i) => (
                <div key={i} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex justify-between gap-3">
                    <SkeletonText lines={2} className="flex-1" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </div>
                  <div className="mt-4 flex justify-between">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
