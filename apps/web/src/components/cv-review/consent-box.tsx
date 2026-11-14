'use client';

import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CandidateProfile } from '@launchly/shared';
import { acceptAiConsent } from '@/lib/api/candidate';
import { ApiError } from '@/lib/api/http';

/** Explicit consent before a CV is sent to the AI (Decree 13/2023). */
export function ConsentBox({ onAccepted }: { onAccepted: (profile: CandidateProfile) => void }) {
  const t = useTranslations('candidate.cvReview.consent');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agree() {
    setPending(true);
    setError(null);
    try {
      onAccepted(await acceptAiConsent());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('saveError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="space-y-4">
      <section aria-label={t('label')} className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary-subtle text-primary-subtle-foreground">
            <ShieldCheck className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-foreground">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">{t('body')}</p>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button onClick={agree} disabled={pending}>
          {pending ? t('saving') : t('agree')}
        </Button>
      </section>
    </Card>
  );
}
