'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { FileText, Download, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { deleteCv, downloadCv } from '@/lib/api/candidate';

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
  const t = useTranslations('candidate.profile.viewer');
  const format = useFormatter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const formattedDate = uploadedAt
    ? format.dateTime(new Date(uploadedAt), {
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
      await deleteCv();
      setShowConfirmModal(false);
      onCvDeleted();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : t('deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  // A plain link cannot send the Bearer token, so fetch the file and save it as a blob.
  const handleDownload = async () => {
    setIsDownloading(true);
    setDeleteError(null);
    try {
      const url = URL.createObjectURL(await downloadCv());
      const link = document.createElement('a');
      link.href = url;
      link.download = originalFileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : t('downloadError'));
    } finally {
      setIsDownloading(false);
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
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('uploadedAt', { date: formattedDate })}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="soft"
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full text-xs"
        >
          <Download className="size-3.5" />
          <span>{isDownloading ? t('downloading') : t('download')}</span>
        </Button>

        <div className="flex gap-2">
          <Button variant="soft" onClick={onStartReplace} className="flex-1 text-xs">
            <RefreshCw className="size-3" />
            <span>{t('replace')}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={() => setShowConfirmModal(true)}
            className="text-xs text-danger hover:bg-danger-subtle hover:text-danger"
          >
            <Trash2 className="size-3" />
            <span>{t('delete')}</span>
          </Button>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-card">
            <div className="flex items-center gap-3 text-warning">
              <AlertTriangle className="size-6 shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">{t('confirmTitle')}</h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t('confirmBody')}</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-danger text-primary-foreground hover:bg-danger/90"
              >
                {isDeleting ? t('deleting') : t('confirmDelete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
