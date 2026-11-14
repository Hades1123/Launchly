'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MAX_COVER_LETTER_LENGTH, type ResumeDto } from '@launchly/shared';
import { Button } from '@/components/ui/button';
import { createApplication } from '@/lib/api/applications';
import { ApiError } from '@/lib/api/http';
import type { JobsTranslator } from '@/lib/job-format';

const fieldClasses =
  'w-full rounded-control border border-input bg-surface px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

/** A duplicate or a closed job is the common failure; say so in plain words. */
function applyErrorMessage(error: unknown, t: JobsTranslator): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return t('applyDialog.errors.alreadyApplied');
    if (error.status === 404) return t('applyDialog.errors.closed');
    return error.message;
  }
  return t('applyDialog.errors.generic');
}

type ApplyDialogProps = {
  jobId: string;
  jobTitle: string;
  /** Newest first, so the first one is preselected. */
  resumes: ResumeDto[];
  onClose: () => void;
  /** `alreadyApplied` is true when the API said a duplicate: the page then shows Applied. */
  onApplied: (alreadyApplied: boolean) => void;
};

/** Step 2 of applying: pick a CV, optionally add a cover letter, submit. */
export function ApplyDialog({ jobId, jobTitle, resumes, onClose, onApplied }: ApplyDialogProps) {
  const t = useTranslations('jobs');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [resumeId, setResumeId] = useState(resumes[0]?.id ?? '');
  const [coverLetter, setCoverLetter] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const letter = coverLetter.trim();
      await createApplication({ jobId, resumeId, ...(letter ? { coverLetter: letter } : {}) });
      onApplied(false);
    } catch (cause) {
      setError(applyErrorMessage(cause, t));
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="apply-dialog-title"
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-card bg-surface p-6 text-foreground shadow-card-hover backdrop:bg-foreground/40"
    >
      <form className="space-y-4" onSubmit={submit}>
        <h2 id="apply-dialog-title" className="font-display text-lg font-semibold break-words">
          {t('applyDialog.title', { title: jobTitle })}
        </h2>

        <div className="space-y-1.5">
          <label htmlFor="apply-cv" className="text-sm font-semibold">
            {t('applyDialog.cv')}
          </label>
          <select
            id="apply-cv"
            className={fieldClasses}
            value={resumeId}
            onChange={(event) => setResumeId(event.target.value)}
          >
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.fileName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="apply-letter" className="text-sm font-semibold">
            {t('applyDialog.coverLetter')}
          </label>
          <textarea
            id="apply-letter"
            rows={5}
            maxLength={MAX_COVER_LETTER_LENGTH}
            className={fieldClasses}
            value={coverLetter}
            onChange={(event) => setCoverLetter(event.target.value)}
          />
          <p className="text-right text-xs text-subtle-foreground">
            {coverLetter.length} / {MAX_COVER_LETTER_LENGTH}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-control bg-danger-subtle px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => dialogRef.current?.close()}>
            {t('applyDialog.cancel')}
          </Button>
          <Button type="submit" disabled={pending || !resumeId}>
            {pending ? t('applyDialog.sending') : t('applyDialog.submit')}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
