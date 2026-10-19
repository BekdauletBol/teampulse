import { Bubble, ButtonLink, Card, EmojiBurst, PageTransition, Sticker } from "../components/ui";

/** Positioned inside the hero only, so they never collide with the feature cards. */
const FLOATERS: Array<{ emoji: string; className: string; delay: string }> = [
  { emoji: "📌", className: "left-[2%] top-[6%] sm:left-[6%] sm:top-[14%]", delay: "0s" },
  { emoji: "⏰", className: "right-[3%] top-[8%] sm:right-[8%] sm:top-[12%]", delay: "-1.2s" },
  { emoji: "✅", className: "left-[10%] bottom-[10%] hidden sm:block", delay: "-2.4s" },
  { emoji: "💬", className: "right-[10%] bottom-[12%] hidden sm:block", delay: "-3.1s" },
  { emoji: "🔥", className: "left-[24%] top-[4%] hidden md:block", delay: "-0.6s" },
  { emoji: "🧑‍🎓", className: "right-[22%] bottom-[6%] hidden md:block", delay: "-1.9s" },
];

const FEATURES = [
  { emoji: "🧑‍🤝‍🧑", burst: ["🧑‍🤝‍🧑", "📋", "👀"], title: "who does what, and when", body: "every task has a name next to it. no more 'i thought you were doing that'." },
  { emoji: "⏰", burst: ["⏰", "🔥", "📅"], title: "deadlines you can see", body: "dates live on the board, not in someone's dm. the whole team sees what's due." },
  { emoji: "✅", burst: ["✅", "🎉", "🙌"], title: "move it to done", body: "to do → in progress → done. one tap, a little confetti, everyone knows." },
];

export default function Landing() {
  return (
    <PageTransition>
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl flex-col px-4 sm:px-6">
        {/* hero */}
        <div className="relative flex flex-1 flex-col items-center justify-center py-16 text-center sm:py-24">
          {/* floating stickers */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {FLOATERS.map((f) => (
              <span key={f.emoji} className={`absolute ${f.className}`}>
                <Sticker size="md" float seed={f.emoji} className="opacity-90 sm:text-6xl" delay={f.delay}>
                  {f.emoji}
                </Sticker>
              </span>
            ))}
          </div>

          <Bubble tone="blue" tail="left" size="sm" className="mb-6">
            for student project teams
          </Bubble>
          <h1 className="font-display text-[44px] lowercase leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
            your team,
            <br />
            <span className="text-gradient">one board.</span>
          </h1>
          <p className="mt-5 max-w-md text-[17px] text-muted sm:text-lg">
            tasks, deadlines and who's on what. the whole group project, on one screen.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <EmojiBurst emojis={["✨", "🤝", "🚀"]} inline>
              <ButtonLink to="/register" size="lg" className="w-full sm:w-auto">
                get started
              </ButtonLink>
            </EmojiBurst>
            <EmojiBurst emojis={["👋", "🔑"]} inline>
              <ButtonLink to="/login" size="lg" variant="secondary" className="w-full sm:w-auto">
                log in
              </ButtonLink>
            </EmojiBurst>
          </div>
        </div>

        {/* features */}
        <div className="grid gap-4 pb-16 sm:grid-cols-3 sm:gap-6">
          {FEATURES.map((f) => (
            <EmojiBurst key={f.title} emojis={f.burst}>
              <Card hover className="flex h-full flex-col gap-4">
                <Sticker size="md" seed={f.title}>
                  {f.emoji}
                </Sticker>
                <Bubble tone="blue" tail="left" className="self-start">
                  {f.title}
                </Bubble>
                <p className="text-[15px] text-muted">{f.body}</p>
              </Card>
            </EmojiBurst>
          ))}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:px-6">
          <span className="font-display text-xl lowercase text-ink">teampulse</span>
          <span>made for group projects that actually ship · sprint 1</span>
        </div>
      </footer>
    </PageTransition>
  );
}
