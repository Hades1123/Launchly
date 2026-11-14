'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ResumeDto } from '@launchly/shared';
import { ApplyDialog } from '@/components/jobs/apply-dialog';
import { Button, buttonClasses } from '@/components/ui/button';
import { listMyApplications } from '@/lib/api/applications';
import { getCandidateProfile } from '@/lib/api/candidate';
import { useAuth } from '@/lib/auth-context';

type Candidate = { resumes: ResumeDto[]; applied: boolean };
type Loaded = Candidate | 'error';

/** The Apply action of the job page: what it shows depends on who is looking. */
export function JobActions({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const t = useTranslations('jobs.actions');
  const { status, user } = useAuth();
  const [candidate, setCandidate] = useState<Loaded | null>(null);
  const [open, setOpen] = useState(false);
  const [justApplied, setJustApplied] = useState(false);

  const isCandidate = status === 'authenticated' && user?.role === 'CANDIDATE';

  useEffect(() => {
    if (!isCandidate) return;
    let active = true;
    Promise.all([getCandidateProfile(), listMyApplications()])
      .then(([profile, applications]) => {
        if (!active) return;
        setCandidate({
          resumes: profile.resumes,
          applied: applications.data.some((item) => item.jobId === jobId),
        });
      })
      .catch(() => active && setCandidate('error'));
    return () => {
      active = false;
    };
  }, [isCandidate, jobId]);

  if (status === 'anonymous') {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/jobs/${jobId}`)}`}
        className={buttonClasses('primary')}
      >
        {t('apply')}
      </Link>
    );
  }
  // Recruiters and admins cannot apply; while the session loads nothing is shown.
  if (!isCandidate) return null;

  if (!candidate) {
    return (
      <Button disabled aria-disabled="true">
        {t('apply')}
      </Button>
    );
  }

  if (candidate === 'error') {
    return (
      <>
        <Button disabled aria-disabled="true">
          {t('apply')}
        </Button>
        <p role="alert" className="w-full text-sm text-danger">
          {t('checkFailed')}
        </p>
      </>
    );
  }

  if (candidate.applied) {
    return (
      <>
        <Button disabled aria-disabled="true">
          {t('applied')}
        </Button>
        {justApplied && (
          <p role="status" className="w-full text-sm text-success">
            {t('sent')}{' '}
            <Link href="/applications" className="font-semibold underline">
              {t('viewApplications')}
            </Link>
          </p>
        )}
      </>
    );
  }

  if (candidate.resumes.length === 0) {
    return (
      <>
        <Button disabled aria-disabled="true">
          {t('apply')}
        </Button>
        <p className="w-full text-sm text-muted-foreground">
          {t('needCv')}{' '}
          <Link href="/profile" className="font-semibold text-primary hover:underline">
            {t('uploadCv')}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>{t('apply')}</Button>
      {open && (
        <ApplyDialog
          jobId={jobId}
          jobTitle={jobTitle}
          resumes={candidate.resumes}
          onClose={() => setOpen(false)}
          onApplied={(alreadyApplied) => {
            setOpen(false);
            setJustApplied(!alreadyApplied);
            setCandidate({ ...candidate, applied: true });
          }}
        />
      )}
    </>
  );
}
