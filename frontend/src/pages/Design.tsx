import { useState, type ReactNode } from "react";
import { DeadlineChip } from "../components/board/DeadlineChip";
import { StatusSelect } from "../components/board/StatusSelect";
import { toISODate } from "../lib/dates";
import { useTheme } from "../lib/theme";
import type { TaskStatus } from "../lib/api";
import {
  Avatar,
  AvatarStack,
  Bubble,
  Button,
  ButtonLink,
  Card,
  EmojiBurst,
  Input,
  Modal,
  PageTransition,
  STATUS_META,
  Skeleton,
  SkeletonText,
  StatusPill,
  Sticker,
  Switch,
  useToast,
} from "../components/ui";

const TOKENS = [
  ["--bg", "background"],
  ["--surface", "surface"],
  ["--surface-2", "elevated surface"],
  ["--border", "border"],
  ["--text", "text"],
  ["--muted", "muted"],
  ["--accent", "accent"],
  ["--accent-2", "accent (gradient end)"],
  ["--bubble", "bubble"],
  ["--bubble-text", "bubble text"],
  ["--todo", "status · to do"],
  ["--progress", "status · in progress"],
  ["--done", "status · done"],
  ["--danger-soft", "danger (soft)"],
  ["--sticker-glow", "sticker glow"],
] as const;

const day = (offset: number) => toISODate(new Date(Date.now() + offset * 86_400_000));

/** Storybook-lite: every component in one scrollable page. */
export default function Design() {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [modal, setModal] = useState(false);
  const [val, setVal] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");

  return (
    <PageTransition className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Bubble size="sm">design system · sprint 1</Bubble>
          <label className="flex items-center gap-3 text-sm text-muted">
            <span aria-hidden>{theme === "light" ? "☀️" : "🌙"}</span>
            light mode
            <Switch checked={theme === "light"} onChange={(on) => setTheme(on ? "light" : "dark")} label="light mode" />
          </label>
        </div>
        <h1 className="font-display text-5xl lowercase leading-none sm:text-7xl">
          playful sticker board, <span className="text-gradient">apple-clean</span> underneath.
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          one accent, 8pt grid, 44px tap targets, soft layered shadows. hover anything below: every interactive
          element declares its own emoji set.
        </p>
      </header>

      <Section title="tokens" hint="dark is the default. light applies via prefers-color-scheme or the switch; both live as css variables on :root.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {TOKENS.map(([v, label]) => (
            <div key={v} className="flex flex-col gap-2">
              <div className="h-16 rounded-2xl border border-line" style={{ background: `var(${v})` }} />
              <div className="text-xs">
                <div className="font-medium">{label}</div>
                <div className="font-mono text-muted">{v}</div>
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2 col-span-2 sm:col-span-5">
            <div className="h-12 rounded-2xl bg-gradient-to-r from-accent to-accent-2" />
            <div className="text-xs">
              <span className="font-medium">accent gradient</span> <span className="font-mono text-muted">#4F7BFF → #7FA3FF</span>
            </div>
          </div>
        </div>
      </Section>

      <Section title="type" hint="display: instrument serif, lowercase. body: inter.">
        <div className="flex flex-col gap-4">
          <div className="font-display text-7xl lowercase leading-none">your team, one board.</div>
          <div className="font-display text-4xl lowercase leading-none">section heading</div>
          <div className="font-display text-3xl lowercase leading-none">card title</div>
          <p className="max-w-prose text-[17px]">body large — tasks, deadlines and who's on what. the whole group project, on one screen.</p>
          <p className="max-w-prose text-[15px]">body — every task has a name next to it. no more "i thought you were doing that".</p>
          <p className="text-sm text-muted">caption / muted — 2 open · 5 tasks</p>
        </div>
      </Section>

      <Section title="buttons" hint="pill shape, min 44px, scale 0.97 on press. wrapped in EmojiBurst.">
        <div className="flex flex-wrap items-center gap-3">
          <EmojiBurst emojis={["✨", "🤝", "🚀"]} inline>
            <Button>primary</Button>
          </EmojiBurst>
          <EmojiBurst emojis={["👋", "🔑"]} inline>
            <Button variant="secondary">secondary</Button>
          </EmojiBurst>
          <Button variant="ghost">ghost</Button>
          <Button variant="danger">danger</Button>
          <Button loading>loading</Button>
          <Button disabled>disabled</Button>
          <Button size="sm">small</Button>
          <Button size="lg">large</Button>
          <ButtonLink to="/design" variant="secondary">
            as link
          </ButtonLink>
        </div>
      </Section>

      <Section title="emoji burst" hint="5–9 emojis float up on hover/focus, ~900ms, 650ms cooldown. disabled under prefers-reduced-motion.">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "create team", emojis: ["✨", "🤝", "🚀"] },
            { label: "deadlines", emojis: ["⏰", "🔥"] },
            { label: "done", emojis: ["✅", "🎉"] },
          ].map((d) => (
            <EmojiBurst key={d.label} emojis={d.emojis}>
              <Card hover className="flex min-h-[120px] items-center justify-center">
                <span className="text-[15px] font-medium">hover: {d.label}</span>
              </Card>
            </EmojiBurst>
          ))}
        </div>
      </Section>

      <Section title="cards" hint="rounded-2xl, 1px border, 0 8px 30px rgba(0,0,0,.06). hover lifts 4px with a spring.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>static card</Card>
          <Card hover>hover me (lift)</Card>
          <Card hover padding="lg" className="border-dashed bg-transparent shadow-none">
            dashed / ghost card
          </Card>
        </div>
      </Section>

      <Section title="bubbles" hint="imessage-style with a tail. used for hints, empty states, toasts, errors.">
        <div className="flex flex-col items-start gap-3">
          <Bubble>who does what, and when</Bubble>
          <Bubble tail="right" className="self-end">reply bubble, tail right</Bubble>
          <Bubble tone="gray">gray · neutral hint</Bubble>
          <Bubble tone="success">success · team created</Bubble>
          <Bubble tone="error">error · that email's already taken</Bubble>
          <Bubble size="sm">small bubble</Bubble>
          <Bubble tail="none">no tail</Bubble>
          <Button variant="secondary" onClick={() => toast.show("saved to the board", { emoji: "📌" })}>
            show a toast
          </Button>
        </div>
      </Section>

      <Section title="stickers" hint="thick outline via stacked drop-shadows; deterministic tilt in −6…6°. optional slow float.">
        <div className="flex flex-wrap items-end gap-6">
          <Sticker size="sm">📌</Sticker>
          <Sticker size="md">⏰</Sticker>
          <Sticker size="lg">🧑‍🎓</Sticker>
          <Sticker size="xl">🎉</Sticker>
          <Sticker size="lg" float>
            🔥
          </Sticker>
          <Sticker size="md" tilt={0}>
            ✅
          </Sticker>
        </div>
      </Section>

      <Section title="empty state" hint="sticker + bubble + exactly one action.">
        <Card padding="lg" className="flex flex-col items-center gap-6 py-10 text-center sm:flex-row sm:text-left">
          <Sticker size="xl" seed="empty">
            🧑‍🎓
          </Sticker>
          <div className="flex flex-col items-center gap-4 sm:items-start">
            <Bubble>no teams yet. start one and send your group the invite link.</Bubble>
            <EmojiBurst emojis={["✨", "🤝", "🚀"]} inline>
              <Button size="lg">create your first team</Button>
            </EmojiBurst>
          </div>
        </Card>
      </Section>

      <Section title="board bits" hint="deadline chips: red tint when overdue, amber within 24h. status select is the keyboard/touch fallback for drag-and-drop.">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <DeadlineChip iso={day(-3)} />
            <DeadlineChip iso={day(0)} />
            <DeadlineChip iso={day(1)} />
            <DeadlineChip iso={day(9)} />
            <span className="text-xs text-muted">no deadline</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusSelect value={status} onChange={setStatus} />
            <span className="text-sm text-muted">← change me</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(STATUS_META) as TaskStatus[]).map((s) => (
              <div key={s} className="flex items-center justify-between rounded-2xl border border-line bg-bg px-4 py-3">
                <span className="font-display text-2xl lowercase leading-none">{STATUS_META[s].label}</span>
                <span className={"inline-flex min-w-[28px] justify-center rounded-full px-2 py-0.5 text-xs font-semibold " + STATUS_META[s].className}>
                  {s === "todo" ? 3 : s === "in_progress" ? 2 : 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="skeletons" hint="loading states mirror the real layout instead of spinning.">
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
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
      </Section>

      <Section title="inputs" hint="44px tall, rounded-2xl, inline validation renders a small error bubble.">
        <div className="grid max-w-xl gap-4">
          <Input label="email" placeholder="you@uni.edu" value={val} onChange={(e) => setVal(e.target.value)} hint="we won't email you. we don't even have email." />
          <Input label="password" type="password" placeholder="••••••••" error="make it at least 8 characters" readOnly />
        </div>
      </Section>

      <Section title="avatars & status" hint="initials with a stable hue per name. status pills use the three status tokens.">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Avatar name="Ann Lee" size="sm" />
            <Avatar name="Bekdaulet B" />
            <Avatar name="Sam" size="lg" />
          </div>
          <AvatarStack names={["Ann Lee", "Bob Ray", "Cleo", "Dan", "Eve", "Finn"]} />
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((s) => (
              <StatusPill key={s} status={s} />
            ))}
          </div>
        </div>
      </Section>

      <Section title="modal" hint="spring pop, backdrop blur, esc to close, sheet-style on mobile.">
        <Button variant="secondary" onClick={() => setModal(true)}>
          open modal
        </Button>
        <Modal open={modal} onClose={() => setModal(false)} title="new team">
          <div className="flex flex-col gap-4">
            <Input label="team name" placeholder="e.g. cs101 final project" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModal(false)}>
                cancel
              </Button>
              <Button onClick={() => setModal(false)}>create team</Button>
            </div>
          </div>
        </Modal>
      </Section>

      <Section title="motion rules" hint="all of it respects prefers-reduced-motion.">
        <ul className="grid gap-2 text-[15px] sm:grid-cols-2">
          <li className="rounded-2xl bg-bubble px-4 py-3 text-bubble-ink">cards lift 4px on hover · spring 420/28</li>
          <li className="rounded-2xl bg-bubble px-4 py-3 text-bubble-ink">buttons scale 0.97 on press</li>
          <li className="rounded-2xl bg-bubble px-4 py-3 text-bubble-ink">pages fade + slide 8px, 220ms</li>
          <li className="rounded-2xl bg-bubble px-4 py-3 text-bubble-ink">dropped cards settle with an overshoot curve</li>
          <li className="rounded-2xl bg-bubble px-4 py-3 text-bubble-ink">submit moments fire a big burst (16–21 emojis)</li>
          <li className="rounded-2xl bg-bubble px-4 py-3 text-bubble-ink">emoji bursts: off when reduced motion is on</li>
        </ul>
      </Section>
    </PageTransition>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mb-14">
      <div className="mb-5">
        <h2 className="font-display text-4xl lowercase leading-none">{title}</h2>
        {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
