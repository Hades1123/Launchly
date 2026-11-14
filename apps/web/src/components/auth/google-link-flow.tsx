'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AuthFeedback, AuthHeading } from '@/components/auth/auth-ui';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage } from '@/lib/auth-helpers';
import { completeGoogleLink } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';

export function GoogleLinkFlow({ token }: { token?: string }) {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const { acceptSession } = useAuth();
  const started = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<'pending' | 'error' | 'expired'>(
    token ? 'pending' : 'expired',
  );
  const [error, setError] = useState<string | null>(token ? null : t('googleLink.missingToken'));

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void (async () => {
      try {
        const session = await completeGoogleLink({ token });
        window.history.replaceState(null, '', '/google-link');
        acceptSession(session.accessToken, session.user);
        router.replace('/jobs');
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 400) {
          window.history.replaceState(null, '', '/google-link');
          setPhase('expired');
        } else {
          setPhase('error');
        }
        setError(authErrorMessage(cause, tErrors));
      }
    })();
  }, [acceptSession, attempt, router, tErrors, token]);

  return (
    <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      <AuthHeading
        eyebrow={t('googleLink.eyebrow')}
        title={phase === 'pending' ? t('googleLink.pendingTitle') : t('googleLink.expiredTitle')}
        description={
          phase === 'pending'
            ? t('googleLink.pendingDescription')
            : t('googleLink.expiredDescription')
        }
      />
      {error ? (
        <AuthFeedback tone="error">{error}</AuthFeedback>
      ) : phase === 'pending' ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t('common.pleaseWait')}
        </p>
      ) : null}
      {phase === 'error' && (
        <button
          type="button"
          onClick={() => {
            started.current = false;
            setAttempt((value) => value + 1);
            setPhase('pending');
            setError(null);
          }}
          className="mt-4 min-h-12 w-full rounded-control bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t('googleLink.retry')}
        </button>
      )}
      <Link
        href="/login"
        className="mt-5 block text-center text-sm font-semibold text-primary hover:text-primary-hover"
      >
        {t('common.backToLogin')}
      </Link>
    </section>
  );
}
