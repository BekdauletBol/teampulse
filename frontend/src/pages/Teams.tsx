import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, type Task, type Team, type TeamDetail } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  AvatarStack,
  Bubble,
  Button,
  Card,
  EmojiBurst,
  Input,
  Modal,
  PageTransition,
  Spinner,
  Sticker,
  useToast,
} from "../components/ui";

type TeamCard = TeamDetail & { taskCount: number; openCount: number };

async function loadTeams(): Promise<TeamCard[]> {
  const teams = await api.get<Team[]>("/teams");
  return Promise.all(
    teams.map(async (t) => {
      const [detail, tasks] = await Promise.all([
        api.get<TeamDetail>(`/teams/${t.id}`),
        api.get<Task[]>(`/teams/${t.id}/tasks`),
      ]);
      return { ...detail, taskCount: tasks.length, openCount: tasks.filter((x) => x.status !== "done").length };
    }),
  );
}

export default function Teams() {
  const { user } = useAuth();
  const toast = useToast();
  const [teams, setTeams] = useState<TeamCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => {
    setError(null);
    loadTeams()
      .then(setTeams)
      .catch((e) => setError(e instanceof ApiError ? e.detail : "couldn't load your teams"));
  }, []);

  useEffect(refresh, [refresh]);

  const onCreated = (t: TeamDetail) => {
    setOpen(false);
    setTeams((prev) => [...(prev ?? []), { ...t, taskCount: 0, openCount: 0 }]);
    toast.show(`${t.name} is ready`, { emoji: "🎉" });
  };

  return (
    <PageTransition className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl lowercase leading-none sm:text-6xl">my teams</h1>
          <p className="mt-2 text-[15px] text-muted">hey {user?.name.split(" ")[0].toLowerCase()}, pick a board or start a new one.</p>
        </div>
        {teams && teams.length > 0 && (
          <EmojiBurst emojis={["✨", "🤝", "🚀"]} inline>
            <Button onClick={() => setOpen(true)}>+ new team</Button>
          </EmojiBurst>
        )}
      </div>

      <div className="mt-8">
        {error ? (
          <div className="flex flex-col items-start gap-4">
            <Bubble tone="error">{error}</Bubble>
            <Button variant="secondary" onClick={refresh}>
              try again
            </Button>
          </div>
        ) : teams === null ? (
          <div className="flex items-center gap-3 text-muted">
            <Spinner /> loading your boards…
          </div>
        ) : teams.length === 0 ? (
          <EmptyState onCreate={() => setOpen(true)} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {teams.map((t) => (
              <li key={t.id}>
                <TeamCardView team={t} isOwner={t.owner_id === user?.id} />
              </li>
            ))}
            <li>
              <NewTeamCard onClick={() => setOpen(true)} />
            </li>
          </ul>
        )}
      </div>

      <CreateTeamModal open={open} onClose={() => setOpen(false)} onCreated={onCreated} />
    </PageTransition>
  );
}

function TeamCardView({ team, isOwner }: { team: TeamCard; isOwner: boolean }) {
  return (
    <EmojiBurst emojis={["📋", "👀", "🔥"]} className="h-full">
      <Card hover padding="none" className="h-full">
        <Link to={`/teams/${team.id}`} className="flex h-full flex-col gap-5 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-3xl lowercase leading-none">{team.name}</h2>
            {isOwner && (
              <span className="rounded-full bg-bubble px-2.5 py-1 text-xs font-medium text-bubble-ink">owner</span>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between">
            <AvatarStack names={team.members.map((m) => m.name)} />
            <span className="text-sm text-muted">
              {team.taskCount === 0
                ? "no tasks yet"
                : `${team.openCount} open · ${team.taskCount} task${team.taskCount === 1 ? "" : "s"}`}
            </span>
          </div>
        </Link>
      </Card>
    </EmojiBurst>
  );
}

function NewTeamCard({ onClick }: { onClick: () => void }) {
  return (
    <EmojiBurst emojis={["✨", "🤝", "🚀"]} className="h-full">
      <Card
        hover
        padding="none"
        className="h-full min-h-[148px] border-dashed bg-transparent shadow-none hover:shadow-soft"
      >
        <button
          onClick={onClick}
          className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl p-6 text-muted hover:text-ink"
        >
          <span className="text-4xl leading-none" aria-hidden>
            +
          </span>
          <span className="text-[15px] font-medium">new team</span>
        </button>
      </Card>
    </EmojiBurst>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card padding="lg" className="flex flex-col items-center gap-6 py-12 text-center sm:flex-row sm:text-left">
      <Sticker size="xl" seed="empty">
        🧑‍🎓
      </Sticker>
      <div className="flex flex-col items-center gap-4 sm:items-start">
        <Bubble tone="blue" tail="left">
          no teams yet. start one and send your group the invite link.
        </Bubble>
        <EmojiBurst emojis={["✨", "🤝", "🚀"]} inline>
          <Button size="lg" onClick={onCreate}>
            create your first team
          </Button>
        </EmojiBurst>
      </div>
    </Card>
  );
}

function CreateTeamModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (t: TeamDetail) => void;
}) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setTouched(false);
      setErr(null);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const nameError = !name.trim() ? "give it a name" : name.trim().length > 100 ? "a bit shorter, please" : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (nameError) return;
    setBusy(true);
    setErr(null);
    try {
      onCreated(await api.post<TeamDetail>("/teams", { name: name.trim() }));
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.detail : "couldn't create the team just now");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="new team">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          ref={inputRef}
          label="team name"
          placeholder="e.g. cs101 final project"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched ? nameError : undefined}
          maxLength={100}
        />
        <Bubble tone="blue" size="sm">
          you'll be the owner. invite your group with a link right after.
        </Bubble>
        {err && (
          <Bubble tone="error" size="sm" role="alert">
            {err}
          </Bubble>
        )}
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            cancel
          </Button>
          <EmojiBurst emojis={["✨", "🤝", "🚀"]} inline>
            <Button type="submit" loading={busy} className="w-full sm:w-auto">
              create team
            </Button>
          </EmojiBurst>
        </div>
      </form>
    </Modal>
  );
}
