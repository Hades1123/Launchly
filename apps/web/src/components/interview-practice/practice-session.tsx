'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { PracticeSessionDto, PracticeStatus } from '@launchly/shared';
import { RoundFeedbackView, SummaryView } from '@/components/interview-practice/feedback-view';
import { isGeneralRound } from '@/components/interview-practice/labels';
import { RoundPanel } from '@/components/interview-practice/round-panel';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api/http';
import { getPracticeSession } from '@/lib/api/interview-practice';

const statusTone: Record<PracticeStatus, BadgeTone> = {
  NOT_STARTED: 'neutral',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
};

type Loaded = { session: PracticeSessionDto } | { error: 'gone' | 'failed' } | null;

/** One practice session: the round in progress, then the saved feedback and summary. */
export function PracticeSession({ id }: { id: string }) {
  const t = useTranslations('candidate.interviewPractice');
  const [loaded, setLoaded] = useState<Loaded>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const session = await getPracticeSession(id);
        if (active) setLoaded({ session });
      } catch (cause) {
        if (!active) return;
        setLoaded({ error: cause instanceof ApiError && cause.status === 404 ? 'gone' : 'failed' });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  if (!loaded) return <Card className="text-sm text-muted-foreground">{t('loading')}</Card>;
  if ('error' in loaded) {
    return (
      <Card className="space-y-3 text-sm text-muted-foreground">
        <p role="alert">{loaded.error === 'gone' ? t('session.gone') : t('session.loadError')}</p>
        <Link href="/interview-practice" className={buttonClasses('soft')}>
          {t('session.back')}
        </Link>
      </Card>
    );
  }

  const { session } = loaded;
  const active = session.rounds.find((round) => round.status !== 'COMPLETED');
  const finished = session.rounds.filter((round) => round.status === 'COMPLETED');
  const roundName = (round: (typeof session.rounds)[number]) =>
    isGeneralRound(round) ? t('session.generalRound') : round.name;

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-semibold text-foreground">{session.jobTitle}</h2>
          <Badge tone={statusTone[session.status]} shape="pill">
            {t(`session.status.${session.status}`)}
          </Badge>
          <Badge tone="neutral" shape="pill">
            {t(`session.scope.${session.scope}`)}
          </Badge>
        </div>
        <ol aria-label={t('session.roundsLabel')} className="space-y-2">
          {session.rounds.map((round) => (
            <li
              key={round.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-muted px-3 py-2 text-sm"
            >
              <span className="text-foreground">{roundName(round)}</span>
              <Badge tone={statusTone[round.status]} shape="pill">
                {t(`session.status.${round.status}`)}
              </Badge>
            </li>
          ))}
        </ol>
        <Link
          href="/interview-practice"
          className="text-sm font-semibold text-primary hover:underline"
        >
          {t('session.back')}
        </Link>
      </Card>

      {active && (
        <RoundPanel
          key={active.id}
          sessionId={session.id}
          round={active}
          roundName={roundName(active)}
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
        <Card className="text-sm text-muted-foreground">{t('session.noFeedback')}</Card>
      )}
    </div>
  );
}
