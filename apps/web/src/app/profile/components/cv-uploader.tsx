'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { CvMetadata } from '@launchly/shared';
import { Button } from '@/components/ui/button';
import { UploadCloud } from 'lucide-react';
import { uploadCv } from '@/lib/api/candidate';

interface CvUploaderProps {
  onCvUploaded: (metadata: CvMetadata) => void;
  isReplacing?: boolean;
  onCancelReplace?: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function CvUploader({ onCvUploaded, isReplacing, onCancelReplace }: CvUploaderProps) {
  const t = useTranslations('candidate.profile.uploader');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError(t('invalidType'));
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(t('tooLarge'));
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const metadata = await uploadCv(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onCvUploaded(metadata);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-control border border-danger/20 bg-danger-subtle p-3 text-xs text-danger">
          {error}
        </div>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        className="group relative flex cursor-pointer flex-col items-center justify-center rounded-control border-2 border-dashed border-input bg-surface-muted/50 p-6 text-center transition-colors hover:border-primary hover:bg-surface"
      >
        <UploadCloud className="size-8 text-subtle-foreground transition-colors group-hover:text-primary" />
        <p className="mt-2 text-xs font-semibold text-foreground">
          {selectedFile ? selectedFile.name : t('choose')}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t('hint')}</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="flex-1"
        >
          {isUploading ? t('uploading') : isReplacing ? t('replace') : t('upload')}
        </Button>

        {isReplacing && onCancelReplace && (
          <Button variant="ghost" type="button" onClick={onCancelReplace}>
            {t('cancel')}
          </Button>
        )}
      </div>
    </div>
  );
}
