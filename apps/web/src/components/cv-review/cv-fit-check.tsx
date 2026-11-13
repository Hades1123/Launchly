'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  const { status, user } = useAuth();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentDto | null>(null);

  const isCandidate = status === 'authenticated' && user?.role === 'CANDIDATE';

  useEffect(() => {
    if (!isCandidate) return;
    let active = true;
    getCandidateProfile()
      .then((loaded) => active && setProfile(loaded))
      .catch(
        (cause) =>
          active &&
          setLoadError(cause instanceof ApiError ? cause.message : 'Could not load your profile.'),
      );
    return () => {
      active = false;
    };
  }, [isCandidate]);

  async function analyse(input: CreateAssessmentInput) {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      setResult(await createAssessment(input));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The analysis failed. Try again.');
    } finally {
      setPending(false);
    }
  }

  if (status === 'loading') return <Notice>Loading…</Notice>;
  if (status !== 'authenticated') {
    return (
      <Notice>
        <Link
          href={`/login?next=${encodeURIComponent(jobId ? `/cv-review?jobId=${jobId}` : '/cv-review')}`}
          className={buttonClasses('primary')}
        >
          Log in to check your CV
        </Link>
      </Notice>
    );
  }
  if (!isCandidate) return <Notice>The CV fit check is available to candidates only.</Notice>;
  if (loadError) return <Notice>{loadError}</Notice>;
  if (!profile) return <Notice>Loading…</Notice>;

  if (!profile.aiConsentAcceptedAt) {
    return (
      <ConsentBox
        onAccepted={() => setProfile({ ...profile, aiConsentAcceptedAt: new Date().toISOString() })}
      />
    );
  }
  if (profile.resumes.length === 0) {
    return (
      <Notice>
        Upload a CV first.{' '}
        <Link href="/profile" className="font-semibold text-primary hover:underline">
          Go to your profile
        </Link>
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
          Analysing your CV. This can take up to 30 seconds…
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
