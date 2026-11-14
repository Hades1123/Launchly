'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AssessmentDto, CandidateProfile, CreateAssessmentInput } from '@launchly/shared';
import { ConsentBox } from '@/components/cv-review/consent-box';
import { FitCheckForm } from '@/components/cv-review/fit-check-form';
import { FitResult } from '@/components/cv-review/fit-result';
import { Card } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';
import { createAssessment } from '@/lib/api/assessments';
import { getCandidateProfile } from '@/lib/api/candidate';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth-context';

function Notice({ children }: { children: React.ReactNode }) {
  return <Card className="text-sm text-muted-foreground">{children}</Card>;
}

export function CvFitCheck({ jobId }: { jobId?: string }) {
  const t = useTranslations('candidate.cvReview.check');
  const { status, user } = useAuth();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentDto | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const isCandidate = status === 'authenticated' && user?.role === 'CANDIDATE';

  useEffect(() => {
    if (!isCandidate) return;
    let active = true;
    getCandidateProfile()
      .then((loaded) => active && setProfile(loaded))
      .catch(
        (cause) =>
          active && setLoadError(cause instanceof ApiError ? cause.message : t('loadError')),
      );
    return () => {
      active = false;
    };
  }, [isCandidate, t]);

  // Leaving the page cancels an analysis that is still running.
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function analyse(input: CreateAssessmentInput) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const assessment = await createAssessment(input, controller.signal);
      if (!controller.signal.aborted) setResult(assessment);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof ApiError ? cause.message : t('analysisError'));
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  if (status === 'loading') return <Notice>{t('loading')}</Notice>;
  if (status !== 'authenticated') {
    return (
      <Notice>
        <Link
          href={`/login?next=${encodeURIComponent(jobId ? `/cv-review?jobId=${jobId}` : '/cv-review')}`}
          className={buttonClasses('primary')}
        >
          {t('logIn')}
        </Link>
      </Notice>
    );
  }
  if (!isCandidate) return <Notice>{t('candidatesOnly')}</Notice>;
  if (loadError) return <Notice>{loadError}</Notice>;
  if (!profile) return <Notice>{t('loading')}</Notice>;

  if (!profile.aiConsentAcceptedAt) {
    return <ConsentBox onAccepted={setProfile} />;
  }
  if (profile.resumes.length === 0) {
    return (
      <Notice>
        {t.rich('noCv', {
          link: (chunks) => (
            <Link href="/profile" className="font-semibold text-primary hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <FitCheckForm
        resumes={profile.resumes}
        initialJobId={jobId}
        pending={pending}
        onSubmit={analyse}
      />
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('analysing')}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-control bg-danger-subtle px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {result && <FitResult assessment={result} />}
    </div>
  );
}
