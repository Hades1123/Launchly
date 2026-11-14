'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { isInteractiveRoundFormat, type PublicJobDetail } from '@launchly/shared';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ApiError } from '@/lib/api/http';
import { getJob } from '@/lib/api/jobs';
import { startPractice } from '@/lib/api/interview-practice';
import { cn } from '@/lib/cn';

type Loaded = { job: PublicJobDetail } | { error: 'notOpen' | 'loadError' } | null;
type Mode = 'QUICK' | 'ROUNDS';

type ModeOptionProps = {
  title: string;
  body: string;
  badge?: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  /** Extra choices shown under the option while it is selected. */
  children?: ReactNode;
};

/** One way to practice: a selectable card; its extra choices sit outside the label. */
function ModeOption({
  title,
  body,
  badge,
  checked,
  disabled,
  onSelect,
  children,
}: ModeOptionProps) {
  return (
    <div
      className={cn(
        'rounded-card border p-4 transition-colors',
        checked ? 'border-primary bg-primary-subtle/30' : 'border-border',
        disabled && 'opacity-60',
      )}
    >
      <label
        className={cn('flex items-start gap-3', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
      >
        <input
          type="radio"
          name="practice-mode"
          checked={checked}
          disabled={disabled}
          onChange={onSelect}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span className="space-y-1">
          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
            {title}
            {badge && (
              <Badge tone="primary" shape="pill">
                {badge}
              </Badge>
            )}
          </span>
          <span className="block text-sm text-muted-foreground">{body}</span>
        </span>
      </label>
      {checked && children && <div className="mt-4 space-y-4 pl-7">{children}</div>}
    </div>
  );
}

/** The start page for one job: quick practice or its interview rounds, and the interview AI consent. */
export function PracticeStart({ jobId }: { jobId: string }) {
  const t = useTranslations('candidate.interviewPractice');
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded>(null);
  const [mode, setMode] = useState<Mode>('QUICK');
  // Empty while the whole process is picked.
  const [stageId, setStageId] = useState('');
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const job = await getJob(jobId);
        if (active) setLoaded({ job });
      } catch (cause) {
        if (!active) return;
        setLoaded({
          error: cause instanceof ApiError && cause.status === 404 ? 'notOpen' : 'loadError',
        });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [jobId]);

  if (!loaded) return <Card className="text-sm text-muted-foreground">{t('loading')}</Card>;
  if ('error' in loaded) {
    return (
      <Card className="space-y-3 text-sm text-muted-foreground">
        <p role="alert">{t(`start.${loaded.error}`)}</p>
        <Link href="/interview-practice" className={buttonClasses('soft')}>
          {t('start.chooseAnother')}
        </Link>
      </Card>
    );
  }

  const { job } = loaded;
  const interactive = job.stages.filter((stage) => isInteractiveRoundFormat(stage.format));
  const canPickRounds = interactive.length > 0;

  async function start() {
    const scope = mode === 'QUICK' ? 'QUICK' : stageId ? 'ROUND' : 'FULL';
    setPending(true);
    setError(null);
    try {
      const session = await startPractice({
        jobId,
        consent: true,
        scope,
        ...(scope === 'ROUND' ? { stageId } : {}),
      });
      router.push(`/interview-practice/${session.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('start.startError'));
      setPending(false);
    }
  }

  return (
    <Card className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-xl font-semibold text-foreground">{job.title}</h2>
        <p className="text-sm text-muted-foreground">{job.company.name}</p>
        <Link
          href="/interview-practice"
          className="text-sm font-semibold text-primary hover:underline"
        >
          {t('start.chooseAnother')}
        </Link>
      </header>

      <fieldset className="space-y-3">
        <legend className="mb-3 font-display text-base font-semibold text-foreground">
          {t('start.modeLegend')}
        </legend>

        <ModeOption
          title={t('start.quick.title')}
          badge={t('start.quick.badge')}
          body={t('start.quick.body')}
          checked={mode === 'QUICK'}
          onSelect={() => setMode('QUICK')}
        />

        <ModeOption
          title={t('start.byRound.title')}
          body={
            canPickRounds
              ? t('start.byRound.body')
              : job.stages.length > 0
                ? t('start.byRound.unavailable')
                : t('start.byRound.noProcess')
          }
          checked={mode === 'ROUNDS'}
          disabled={!canPickRounds}
          onSelect={() => setMode('ROUNDS')}
        >
          <section aria-label={t('start.process')} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{t('start.process')}</h3>
            <ol className="space-y-2">
              {job.stages.map((stage) => (
                <li
                  key={stage.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface px-3 py-2 text-sm"
                >
                  <span className="text-foreground">{stage.name}</span>
                  {isInteractiveRoundFormat(stage.format) ? (
                    <Badge tone="primary" shape="pill">
                      {t('start.interactive')}
                    </Badge>
                  ) : (
                    <Badge tone="neutral" shape="pill">
                      {t('start.infoOnly')}
                    </Badge>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-foreground">
              {t('start.roundsLegend')}
            </legend>
            <label className="flex items-center gap-3 text-sm text-foreground">
              <input
                type="radio"
                name="practice-rounds"
                checked={stageId === ''}
                onChange={() => setStageId('')}
                className="size-4 accent-primary"
              />
              {t('start.allRounds', { count: interactive.length })}
            </label>
            {interactive.map((stage) => (
              <label key={stage.id} className="flex items-center gap-3 text-sm text-foreground">
                <input
                  type="radio"
                  name="practice-rounds"
                  checked={stageId === stage.id}
                  onChange={() => setStageId(stage.id)}
                  className="size-4 accent-primary"
                />
                {t('start.onlyRound', { name: stage.name })}
              </label>
            ))}
          </fieldset>
        </ModeOption>
      </fieldset>

      <label className="flex items-start gap-1 text-sm text-muted-foreground">
        <Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span className="pt-3">{t('start.consent')}</span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button onClick={start} disabled={!consent || pending}>
        {pending ? t('start.starting') : t('start.start')}
      </Button>
    </Card>
  );
}
