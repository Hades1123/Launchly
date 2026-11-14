'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { resendVerificationSchema } from '@launchly/shared';
import { useTranslations } from 'next-intl';
import { AuthFeedback, AuthField, AuthHeading, SubmitButton } from '@/components/auth/auth-ui';
import { authErrorMessage } from '@/lib/auth-helpers';
import { resendVerification, verifyEmail } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';

type VerificationState = 'verifying' | 'success' | 'expired' | 'missing' | 'error';

export function VerifyEmailFlow({ token }: { token?: string }) {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const started = useRef(false);
  const [state, setState] = useState<VerificationState>(token ? 'verifying' : 'missing');
  const [attempt, setAttempt] = useState(0);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void (async () => {
      try {
        await verifyEmail({ token });
        window.history.replaceState(null, '', '/verify-email');
        setState('success');
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 400) {
          window.history.replaceState(null, '', '/verify-email');
          setState('expired');
        } else {
          setState('error');
        }
        setError(authErrorMessage(cause, tErrors));
      }
    })();
  }, [attempt, tErrors, token]);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const parsed = resendVerificationSchema.safeParse({ email });
    if (!parsed.success) {
      setError(t('fields.emailInvalid'));
      setPending(false);
      return;
    }
    try {
      const result = await resendVerification(parsed.data);
      setNotice(result.message);
    } catch (cause) {
      setError(authErrorMessage(cause, tErrors));
    } finally {
      setPending(false);
    }
  }

  if (state === 'verifying') {
    return (
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
        <AuthHeading
          eyebrow={t('verifyEmail.eyebrow')}
          title={t('verifyEmail.verifying.title')}
          description={t('verifyEmail.verifying.description')}
        />
        <p role="status" className="text-sm text-muted-foreground">
          {t('common.pleaseWait')}
        </p>
      </section>
    );
  }

  if (state === 'success') {
    return (
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
        <AuthHeading
          eyebrow={t('verifyEmail.eyebrow')}
          title={t('verifyEmail.success.title')}
          description={t('verifyEmail.success.description')}
        />
        <AuthFeedback tone="success">{t('verifyEmail.success.notice')}</AuthFeedback>
        <Link
          href="/login"
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t('verifyEmail.success.goToLogin')}
        </Link>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
        <AuthHeading
          eyebrow={t('verifyEmail.eyebrow')}
          title={t('verifyEmail.error.title')}
          description={t('verifyEmail.error.description')}
        />
        {error && <AuthFeedback tone="error">{error}</AuthFeedback>}
        <button
          type="button"
          onClick={() => {
            started.current = false;
            setAttempt((value) => value + 1);
            setState('verifying');
            setError(null);
          }}
          className="mt-5 min-h-12 w-full rounded-control bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t('verifyEmail.error.retry')}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      <AuthHeading
        eyebrow={t('verifyEmail.eyebrow')}
        title={state === 'expired' ? t('verifyEmail.expiredTitle') : t('verifyEmail.missingTitle')}
        description={t('verifyEmail.resendDescription')}
      />
      {error && (
        <div className="mb-4">
          <AuthFeedback tone="error">{error}</AuthFeedback>
        </div>
      )}
      {notice && (
        <div className="mb-4">
          <AuthFeedback tone="success">{notice}</AuthFeedback>
        </div>
      )}
      <form className="space-y-4" onSubmit={resend} noValidate>
        <AuthField
          label={t('verifyEmail.emailLabel')}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t('fields.emailPlaceholder')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <SubmitButton pending={pending}>{t('common.resendVerification')}</SubmitButton>
      </form>
      <Link
        href="/login"
        className="mt-5 block text-center text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        {t('common.backToLogin')}
      </Link>
    </section>
  );
}
