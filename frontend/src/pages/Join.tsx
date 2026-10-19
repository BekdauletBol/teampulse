import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bubble, Button, ButtonLink, Card, EmojiBurst, PageTransition, Skeleton, Sticker, useEmojiBurst, useToast } from "../components/ui";
import { api, ApiError, type TeamDetail, type TeamInvitePreview } from "../lib/api";

export default function Join() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [preview, setPreview] = useState<TeamInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const party = useEmojiBurst(["🎉", "🤝", "✨", "🙌"], { big: true, manual: true });

  useEffect(() => {
    let cancelled = false;
    api
      .get<TeamInvitePreview>(`/teams/join/${encodeURIComponent(token)}`)
      .then((p) => !cancelled && setPreview(p))
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError && e.status === 404 ? "this invite link doesn't work. ask your team for a fresh one." : "couldn't check that invite just now.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const join = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const team = await api.post<TeamDetail>(`/teams/join/${encodeURIComponent(token)}`);
      party.burst(true);
      toast.show(`welcome to ${team.name}`, { emoji: "🎉", tone: "success" });
      window.setTimeout(() => navigate(`/teams/${team.id}`, { replace: true }), 450);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "couldn't join just now. try again?");
      setBusy(false);
    }
  };

  return (
    <PageTransition className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <Card padding="lg" className="flex flex-col items-center gap-5 text-center">
        <Sticker size="xl" seed="invite">
          {error ? "🫥" : "🎉"}
        </Sticker>

        {error ? (
          <>
            <Bubble tone="error" role="alert">
              {error}
            </Bubble>
            <ButtonLink to="/teams" variant="secondary">
              back to my teams
            </ButtonLink>
          </>
        ) : !preview ? (
          <div className="flex w-full flex-col items-center gap-3" aria-busy="true">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-2 h-12 w-40 rounded-full" />
          </div>
        ) : (
          <>
            <h1 className="font-display text-4xl lowercase leading-none sm:text-5xl">
              you're invited to <span className="text-gradient">{preview.name}</span>
            </h1>
            <p className="text-[15px] text-muted">
              {preview.member_count} {preview.member_count === 1 ? "person is" : "people are"} already in.
            </p>
            {preview.already_member ? (
              <>
                <Bubble tone="success">you're already on this team.</Bubble>
                <ButtonLink to={`/teams/${preview.id}`} size="lg">
                  open the board
                </ButtonLink>
              </>
            ) : (
              <div className="relative" {...party.handlers}>
                <EmojiBurst emojis={["🎉", "🤝", "✨"]} inline>
                  <Button size="lg" onClick={join} loading={busy}>
                    join {preview.name}
                  </Button>
                </EmojiBurst>
                {party.layer}
              </div>
            )}
          </>
        )}
      </Card>
    </PageTransition>
  );
}
