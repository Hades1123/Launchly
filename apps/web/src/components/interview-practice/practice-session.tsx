'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PracticeSessionDto, PracticeStatus } from '@launchly/shared';
import { RoundFeedbackView, SummaryView } from '@/components/interview-practice/feedback-view';
import { RoundPanel } from '@/components/interview-practice/round-panel';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api/http';
import { getPracticeSession } from '@/lib/api/interview-practice';

const statusLabel: Record<PracticeStatus, { label: string; tone: BadgeTone }> = {
  NOT_STARTED: { label: 'Not started', tone: 'neutral' },
  IN_PROGRESS: { label: 'In progress', tone: 'warning' },
  COMPLETED: { label: 'Completed', tone: 'success' },
};

type Loaded = { session: PracticeSessionDto } | { error: string } | null;

/** One practice session: the round in progress, then the saved feedback and summary. */
export function PracticeSession({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const session = await getPracticeSession(id);
        if (active) setLoaded({ session });
      } catch (cause) {
        if (!active) return;
        setLoaded({
          error:
            cause instanceof ApiError && cause.status === 404
              ? 'This practice session is no longer available. Unfinished sessions are removed 24 hours after your last activity.'
              : 'Could not load this practice session. Try again.',
        });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  if (!loaded) return <Card className="text-sm text-muted-foreground">Loading…</Card>;
  if ('error' in loaded) {
    return (
      <Card className="space-y-3 text-sm text-muted-foreground">
        <p role="alert">{loaded.error}</p>
        <Link href="/interview-practice" className={buttonClasses('soft')}>
          Back to practice
        </Link>
      </Card>
    );
  }

  const { session } = loaded;
  const active = session.rounds.find((round) => round.status !== 'COMPLETED');
  const finished = session.rounds.filter((round) => round.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-semibold text-foreground">{session.jobTitle}</h2>
          <Badge tone={statusLabel[session.status].tone} shape="pill">
            {statusLabel[session.status].label}
          </Badge>
          <Badge tone="neutral" shape="pill">
            {session.scope === 'FULL' ? 'Full workflow' : 'Single round'}
          </Badge>
        </div>
        <ol aria-label="Rounds" className="space-y-2">
          {session.rounds.map((round) => (
            <li
              key={round.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-muted px-3 py-2 text-sm"
            >
              <span className="text-foreground">{round.name}</span>
              <Badge tone={statusLabel[round.status].tone} shape="pill">
                {statusLabel[round.status].label}
              </Badge>
            </li>
          ))}
        </ol>
        <Link
          href="/interview-practice"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Back to practice
        </Link>
      </Card>

      {active && (
        <RoundPanel
          key={active.id}
          sessionId={session.id}
          round={active}
          onChange={(next) => setLoaded({ session: next })}
        />
      )}

      {finished.length > 0 && (
        <Card className="space-y-8">
          {finished.map((round) => (
            <RoundFeedbackView key={round.id} round={round} />
          ))}
          {session.summary && <SummaryView summary={session.summary} />}
        </Card>
      )}

      {session.status === 'COMPLETED' && finished.length === 0 && (
        <Card className="text-sm text-muted-foreground">
          This session was completed before round feedback was saved, so there is nothing more to
          show.
        </Card>
      )}
    </div>
  );
}
