import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError, type Task, type TeamMember } from "../../lib/api";
import { cn } from "../../lib/cn";
import { toISODate } from "../../lib/dates";
import { Avatar, Bubble, Button, EmojiBurst, Input, Modal } from "../ui";
import { ColorSwatches } from "./ColorSwatches";

type Props = {
  open: boolean;
  onClose: () => void;
  teamId: number;
  members: TeamMember[];
  currentUserId: number;
  onCreated: (task: Task) => void;
  /** When set, the modal edits this task (PATCH) instead of creating one. */
  editing?: Task | null;
  onSaved?: (task: Task) => void;
};

export function AddTaskModal({ open, onClose, teamId, members, currentUserId, onCreated, editing, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignee, setAssignee] = useState<number | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setDeadline(editing?.deadline ?? "");
    setAssignee(editing?.assignee_id ?? null);
    setColor(editing?.color ?? null);
    setTouched(false);
    setErr(null);
    window.setTimeout(() => titleRef.current?.focus(), 60);
  }, [open, editing]);

  const titleError = !title.trim() ? "what needs doing?" : title.trim().length > 200 ? "a bit shorter, please" : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (titleError) return;
    setBusy(true);
    setErr(null);
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      deadline: deadline || null,
      assignee_id: assignee,
      color,
    };
    try {
      if (editing) {
        onSaved?.(await api.patch<Task>(`/teams/${teamId}/tasks/${editing.id}`, body));
      } else {
        onCreated(await api.post<Task>(`/teams/${teamId}/tasks`, body));
      }
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.detail : editing ? "couldn't save that just now" : "couldn't add that just now");
    } finally {
      setBusy(false);
    }
  };

  // owner first, then by join order; current user labelled "you"
  const sorted = [...members].sort((a, b) => (a.role === b.role ? 0 : a.role === "owner" ? -1 : 1));

  return (
    <Modal open={open} onClose={onClose} title={editing ? "edit task" : "add a task"} size="lg">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          ref={titleRef}
          label="title"
          placeholder="e.g. write the intro section"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched ? titleError : undefined}
          maxLength={200}
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="task-desc" className="text-sm font-medium">
            description <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="task-desc"
            rows={3}
            placeholder="any details your teammates should know"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            className="w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="deadline"
            type="date"
            value={deadline}
            min={toISODate(new Date(Date.now() - 365 * 86_400_000))}
            onChange={(e) => setDeadline(e.target.value)}
            hint={deadline ? undefined : "optional"}
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">assignee</span>
            <div role="radiogroup" aria-label="assignee" className="flex flex-wrap gap-2">
              <AssigneeChip selected={assignee === null} onClick={() => setAssignee(null)} label="nobody yet" />
              {sorted.map((m) => (
                <AssigneeChip
                  key={m.user_id}
                  selected={assignee === m.user_id}
                  onClick={() => setAssignee(m.user_id)}
                  label={m.user_id === currentUserId ? "you" : m.name.split(" ")[0].toLowerCase()}
                  avatar={m.name}
                />
              ))}
            </div>
          </div>
        </div>

        <ColorSwatches value={color} onChange={setColor} />

        {err && (
          <Bubble tone="error" size="sm" role="alert">
            {err}
          </Bubble>
        )}

        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            cancel
          </Button>
          <EmojiBurst emojis={editing ? ["💾", "✨"] : ["🚀", "✨", "📌"]} inline>
            <Button type="submit" loading={busy} className="w-full sm:w-auto">
              {editing ? "save" : "add task"}
            </Button>
          </EmojiBurst>
        </div>
      </form>
    </Modal>
  );
}

function AssigneeChip({ selected, onClick, label, avatar }: { selected: boolean; onClick: () => void; label: string; avatar?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={avatar ?? label}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[40px] items-center gap-2 rounded-full border pl-1.5 pr-3 text-sm font-medium transition-colors",
        selected ? "border-accent bg-bubble text-bubble-ink" : "border-line bg-surface text-muted hover:text-ink",
      )}
    >
      {avatar ? (
        <Avatar name={avatar} size="sm" />
      ) : (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-line">·</span>
      )}
      {label}
    </button>
  );
}
