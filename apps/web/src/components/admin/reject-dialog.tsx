'use client';

import { useId, useRef, useState } from 'react';
import { XCircle } from 'lucide-react';
import { MAX_MODERATION_REASON } from '@launchly/shared';
import { Button } from '@/components/ui/button';

/**
 * "Từ chối" button plus a modal that asks for the reason; confirm stays disabled until a
 * non-blank reason is typed. Generic so the job review reuses it.
 */
export function RejectDialog({
  heading,
  onSubmit,
  disabled,
}: {
  heading: string;
  onSubmit: (reason: string) => Promise<void>;
  disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const trimmed = reason.trim();

  async function confirm() {
    setSending(true);
    try {
      await onSubmit(trimmed);
      dialog.current?.close();
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        variant="danger-ghost"
        disabled={disabled}
        onClick={() => {
          setReason('');
          dialog.current?.showModal();
        }}
      >
        <XCircle className="size-4" aria-hidden />
        Từ chối
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        className="m-auto w-11/12 max-w-md rounded-card bg-surface p-6 text-left shadow-card backdrop:bg-foreground/40"
        onCancel={(event) => sending && event.preventDefault()}
      >
        <h2 id={headingId} className="font-display text-lg font-semibold text-foreground">
          {heading}
        </h2>
        <label htmlFor={reasonId} className="mt-4 block text-sm font-medium text-foreground">
          Lý do từ chối
        </label>
        <textarea
          id={reasonId}
          value={reason}
          maxLength={MAX_MODERATION_REASON}
          rows={4}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 w-full rounded-control border border-border bg-surface p-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <p className="mt-1 text-xs text-subtle-foreground">
          Lý do sẽ được gửi cho nhà tuyển dụng qua email.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" disabled={sending} onClick={() => dialog.current?.close()}>
            Hủy
          </Button>
          <Button variant="danger" disabled={!trimmed || sending} onClick={() => void confirm()}>
            Xác nhận từ chối
          </Button>
        </div>
      </dialog>
    </>
  );
}
