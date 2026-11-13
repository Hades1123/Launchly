'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/http';
import { deleteJob, deleteJobs } from '@/lib/api/recruiter-jobs';

function deleteErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'CONFLICT') return 'Có tin đã được gửi duyệt nên không thể xóa.';
    if (error.code === 'NOT_FOUND') return 'Có bản nháp không còn tồn tại. Hãy tải lại trang.';
    if (error.code === 'FORBIDDEN') return 'Bạn không có quyền xóa tin tuyển dụng này.';
  }
  return 'Không thể xóa bản nháp. Vui lòng thử lại.';
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
      setError(deleteErrorText(cause));
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
            Hủy
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

/** "Xóa" for one draft. */
export function DeleteDraftButton({
  jobId,
  title,
  onDeleted,
  label = 'Xóa',
}: {
  jobId: string;
  title: string;
  onDeleted: () => void;
  label?: string;
}) {
  return (
    <ConfirmDeleteButton
      trigger={
        <>
          <Trash2 className="size-4" aria-hidden /> {label}
        </>
      }
      triggerLabel={`Xóa bản nháp ${title}`}
      heading="Xóa bản nháp?"
      body={
        <p>
          Bản nháp “{title}” cùng các vòng tuyển dụng và ghi chú sẽ bị xóa vĩnh viễn. Bạn không thể
          hoàn tác thao tác này.
        </p>
      }
      confirmLabel="Xóa bản nháp"
      onConfirm={() => deleteJob(jobId)}
      onDeleted={onDeleted}
    />
  );
}

/** "Xóa đã chọn" for several drafts at once; all of them are deleted or none. */
export function DeleteDraftsButton({
  jobs,
  onDeleted,
}: {
  jobs: { id: string; title: string }[];
  onDeleted: () => void;
}) {
  const shown = jobs.slice(0, 5);
  return (
    <ConfirmDeleteButton
      variant="danger"
      disabled={jobs.length === 0}
      trigger={
        <>
          <Trash2 className="size-4" aria-hidden /> Xóa {jobs.length} bản nháp
        </>
      }
      triggerLabel={`Xóa ${jobs.length} bản nháp đã chọn`}
      heading={`Xóa ${jobs.length} bản nháp?`}
      body={
        <>
          <p>
            Các bản nháp sau cùng vòng tuyển dụng và ghi chú sẽ bị xóa vĩnh viễn. Bạn không thể hoàn
            tác thao tác này.
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-foreground">
            {shown.map((job) => (
              <li key={job.id} className="truncate">
                {job.title}
              </li>
            ))}
          </ul>
          {jobs.length > shown.length && (
            <p className="mt-1">và {jobs.length - shown.length} bản nháp khác.</p>
          )}
        </>
      }
      confirmLabel={`Xóa ${jobs.length} bản nháp`}
      onConfirm={() => deleteJobs(jobs.map((job) => job.id))}
      onDeleted={onDeleted}
    />
  );
}
