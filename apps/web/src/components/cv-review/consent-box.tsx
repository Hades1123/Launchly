'use client';

import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { acceptAiConsent } from '@/lib/api/candidate';
import { ApiError } from '@/lib/api/http';

/** Explicit consent before a CV is sent to the AI (Decree 13/2023). */
export function ConsentBox({ onAccepted }: { onAccepted: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agree() {
    setPending(true);
    setError(null);
    try {
      await acceptAiConsent();
      onAccepted();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not save your consent. Try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="space-y-4">
      <section aria-label="AI consent" className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary-subtle text-primary-subtle-foreground">
            <ShieldCheck className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Before we check your CV
            </h2>
            <p className="text-sm text-muted-foreground">
              To score your CV, Launchly sends the text of the CV you pick and the job description
              to an AI service. Your name, photo and contact details are not part of the request.
              The result is saved to your account. You can withdraw by contacting support.
            </p>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button onClick={agree} disabled={pending}>
          {pending ? 'Saving…' : 'I agree'}
        </Button>
      </section>
    </Card>
  );
}
