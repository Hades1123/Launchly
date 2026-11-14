'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/http';
import { deleteJob, deleteJobs } from '@/lib/api/recruiter-jobs';

type DeleteDraftT = ReturnType<typeof useTranslations<'recruiter.deleteDraft'>>;

function deleteErrorText(error: unknown, t: DeleteDraftT): string {
  if (error instanceof ApiError) {
    if (error.code === 'CONFLICT') return t('errors.conflict');
    if (error.code === 'NOT_FOUND') return t('errors.notFound');
    if (error.code === 'FORBIDDEN') return t('errors.forbidden');
  }
  return t('errors.generic');
}

/** A button that opens a modal asking to confirm a permanent delete, then runs it. */
function ConfirmDeleteButton({
  trigger,
  triggerLabel,
  heading,
  body,
  confirmLabel,
  onConfirm,
  onDeleted,
  variant = 'danger-ghost',
  disabled,
}: {
  trigger: ReactNode;
  triggerLabel: string;
  heading: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onDeleted: () => void;
  variant?: 'danger-ghost' | 'danger';
  disabled?: boolean;
}) {
  const t = useTranslations('recruiter.deleteDraft');
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      dialog.current?.close();
      onDeleted();
    } catch (cause) {
      setError(deleteErrorText(cause, t));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant={variant}
        disabled={disabled}
        aria-label={triggerLabel}
        onClick={() => {
          setError(null);
          dialog.current?.showModal();
        }}
      >
        {trigger}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        className="m-auto w-11/12 max-w-md rounded-card bg-surface p-6 text-left shadow-card backdrop:bg-foreground/40"
        onCancel={(event) => deleting && event.preventDefault()}
      >
        <div className="flex gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-subtle text-danger">
            <Trash2 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-2">
            <h2 id={headingId} className="font-display text-lg font-semibold text-foreground">
              {heading}
            </h2>
            <div className="text-sm text-muted-foreground">{body}</div>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" disabled={deleting} onClick={() => dialog.current?.close()}>
            {t('cancel')}
          </Button>
          <Button variant="danger" disabled={deleting} onClick={() => void confirm()}>
            {deleting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}{' '}
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}

/** "Xóa" (Delete) for one draft. */
export function DeleteDraftButton({
  jobId,
  title,
  onDeleted,
  label,
}: {
  jobId: string;
  title: string;
  onDeleted: () => void;
  label?: string;
}) {
  const t = useTranslations('recruiter.deleteDraft.one');
  return (
    <ConfirmDeleteButton
      trigger={
        <>
          <Trash2 className="size-4" aria-hidden /> {label ?? t('label')}
        </>
      }
      triggerLabel={t('triggerLabel', { title })}
      heading={t('heading')}
      body={<p>{t('body', { title })}</p>}
      confirmLabel={t('confirm')}
      onConfirm={() => deleteJob(jobId)}
      onDeleted={onDeleted}
    />
  );
}

/** Deletes several selected drafts at once; all of them are deleted or none. */
export function DeleteDraftsButton({
  jobs,
  onDeleted,
}: {
  jobs: { id: string; title: string }[];
  onDeleted: () => void;
}) {
  const t = useTranslations('recruiter.deleteDraft.many');
  const shown = jobs.slice(0, 5);
  const count = jobs.length;
  return (
    <ConfirmDeleteButton
      variant="danger"
      disabled={jobs.length === 0}
      trigger={
        <>
          <Trash2 className="size-4" aria-hidden /> {t('trigger', { count })}
        </>
      }
      triggerLabel={t('triggerLabel', { count })}
      heading={t('heading', { count })}
      body={
        <>
          <p>{t('body')}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-foreground">
            {shown.map((job) => (
              <li key={job.id} className="truncate">
                {job.title}
              </li>
            ))}
          </ul>
          {jobs.length > shown.length && (
            <p className="mt-1">{t('more', { count: jobs.length - shown.length })}</p>
          )}
        </>
      }
      confirmLabel={t('confirm', { count })}
      onConfirm={() => deleteJobs(jobs.map((job) => job.id))}
      onDeleted={onDeleted}
    />
  );
}
