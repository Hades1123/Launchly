'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ResumeDto } from '@launchly/shared';
import { ApplyDialog } from '@/components/jobs/apply-dialog';
import { Button, buttonClasses } from '@/components/ui/button';
import { listMyApplications } from '@/lib/api/applications';
import { getCandidateProfile } from '@/lib/api/candidate';
import { useAuth } from '@/lib/auth-context';

type Candidate = { resumes: ResumeDto[]; applied: boolean };

/** The Apply action of the job page: what it shows depends on who is looking. */
export function JobActions({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const { status, user } = useAuth();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
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
      .catch(() => active && setCandidate({ resumes: [], applied: false }));
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
        Apply
      </Link>
    );
  }
  // Recruiters and admins cannot apply; while the session loads nothing is shown.
  if (!isCandidate) return null;

  if (!candidate) {
    return (
      <Button disabled aria-disabled="true">
        Apply
      </Button>
    );
  }

  if (candidate.applied) {
    return (
      <>
        <Button disabled aria-disabled="true">
          Applied
        </Button>
        {justApplied && (
          <p role="status" className="w-full text-sm text-success">
            Application sent.{' '}
            <Link href="/applications" className="font-semibold underline">
              View my applications
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
          Apply
        </Button>
        <p className="w-full text-sm text-muted-foreground">
          You need a CV to apply.{' '}
          <Link href="/profile" className="font-semibold text-primary hover:underline">
            Upload a CV in your profile
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Apply</Button>
      {open && (
        <ApplyDialog
          jobId={jobId}
          jobTitle={jobTitle}
          resumes={candidate.resumes}
          onClose={() => setOpen(false)}
          onApplied={() => {
            setOpen(false);
            setJustApplied(true);
            setCandidate({ ...candidate, applied: true });
          }}
        />
      )}
    </>
  );
}
