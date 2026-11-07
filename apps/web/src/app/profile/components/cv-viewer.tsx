'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';

interface CvViewerProps {
  originalFileName: string;
  uploadedAt: string | null;
  onCvDeleted: () => void;
  onStartReplace: () => void;
}

export function CvViewer({
  originalFileName,
  uploadedAt,
  onCvDeleted,
  onStartReplace,
}: CvViewerProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const formattedDate = uploadedAt
    ? new Date(uploadedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch('/api/candidates/cv', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || data.message || 'Failed to delete CV.');
      }

      setShowConfirmModal(false);
      onCvDeleted();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'An error occurred during deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {deleteError && (
        <div className="rounded-control border border-danger/20 bg-danger-subtle p-3 text-xs text-danger">
          {deleteError}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-control border border-border bg-surface-muted p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary-subtle text-primary">
          <FileText className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground" title={originalFileName}>
            {originalFileName}
          </p>
          {formattedDate && (
            <p className="mt-0.5 text-xs text-muted-foreground">Uploaded: {formattedDate}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <a
          href="/api/candidates/cv"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-control bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Download className="size-3.5" />
          <span>View / Download CV</span>
        </a>

        <div className="flex gap-2">
          <Button variant="soft" onClick={onStartReplace} className="flex-1 text-xs">
            <RefreshCw className="size-3" />
            <span>Replace</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => setShowConfirmModal(true)}
            className="text-xs text-danger hover:bg-danger-subtle hover:text-danger"
          >
            <Trash2 className="size-3" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center gap-3 text-warning">
              <AlertTriangle className="size-6 shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">Confirm CV deletion</h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Are you sure you want to delete this CV? This action will permanently remove the file
              from private storage and cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-danger text-primary-foreground hover:bg-danger/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete CV'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
