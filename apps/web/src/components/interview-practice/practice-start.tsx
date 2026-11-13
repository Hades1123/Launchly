'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isInteractiveRoundFormat, type PublicJobDetail } from '@launchly/shared';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ApiError } from '@/lib/api/http';
import { getJob } from '@/lib/api/jobs';
import { startPractice } from '@/lib/api/interview-practice';

type Loaded = { job: PublicJobDetail } | { error: string } | null;

/** The start page for one job: its rounds, what to practice, and the interview AI consent. */
export function PracticeStart({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded>(null);
  const [stageId, setStageId] = useState<string>('');
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
          error:
            cause instanceof ApiError && cause.status === 404
              ? 'This job is not open for practice.'
              : 'Could not load this job. Try again.',
        });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [jobId]);

  if (!loaded) return <Card className="text-sm text-muted-foreground">Loading…</Card>;
  if ('error' in loaded) {
    return (
      <Card className="space-y-3 text-sm text-muted-foreground">
        <p role="alert">{loaded.error}</p>
        <Link href="/interview-practice" className={buttonClasses('soft')}>
          Choose another job
        </Link>
      </Card>
    );
  }

  const { job } = loaded;
  const interactive = job.stages.filter((stage) => isInteractiveRoundFormat(stage.format));

  async function start() {
    setPending(true);
    setError(null);
    try {
      const session = await startPractice({
        jobId,
        consent: true,
        ...(stageId ? { stageId } : {}),
      });
      router.push(`/interview-practice/${session.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not start practice. Try again.');
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
          Choose another job
        </Link>
      </header>

      <section aria-label="Hiring process" className="space-y-2">
        <h3 className="font-display text-base font-semibold text-foreground">Hiring process</h3>
        <ol className="space-y-2">
          {job.stages.map((stage) => (
            <li
              key={stage.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-muted px-3 py-2 text-sm"
            >
              <span className="text-foreground">{stage.name}</span>
              {isInteractiveRoundFormat(stage.format) ? (
                <Badge tone="primary" shape="pill">
                  Interactive
                </Badge>
              ) : (
                <Badge tone="neutral" shape="pill">
                  Information only
                </Badge>
              )}
            </li>
          ))}
        </ol>
      </section>

      {interactive.length === 0 ? (
        <p role="alert" className="text-sm text-danger">
          This job has no round that can be practiced.
        </p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="font-display text-base font-semibold text-foreground">
            What do you want to practice?
          </legend>
          <label className="flex items-center gap-3 text-sm text-foreground">
            <input
              type="radio"
              name="practice-scope"
              checked={stageId === ''}
              onChange={() => setStageId('')}
              className="size-4 accent-primary"
            />
            All interactive rounds
          </label>
          {interactive.map((stage) => (
            <label key={stage.id} className="flex items-center gap-3 text-sm text-foreground">
              <input
                type="radio"
                name="practice-scope"
                checked={stageId === stage.id}
                onChange={() => setStageId(stage.id)}
                className="size-4 accent-primary"
              />
              Only {stage.name}
            </label>
          ))}
        </fieldset>
      )}

      <label className="flex items-start gap-1 text-sm text-muted-foreground">
        <Checkbox checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span className="pt-3">
          I agree to send my answers to an AI service to generate practice questions and feedback.
          This is separate from the consent for CV checks.
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button onClick={start} disabled={!consent || pending || interactive.length === 0}>
        {pending ? 'Starting…' : 'Start practice'}
      </Button>
    </Card>
  );
}
