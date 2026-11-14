'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { forgotPasswordSchema } from '@launchly/shared';
import { useTranslations } from 'next-intl';
import { AuthFeedback, AuthField, AuthHeading, SubmitButton } from '@/components/auth/auth-ui';
import { authErrorMessage } from '@/lib/auth-helpers';
import { forgotPassword } from '@/lib/api/auth';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(t('fields.emailInvalid'));
      return;
    }
    setFieldError(undefined);
    setPending(true);
    try {
      await forgotPassword(parsed.data);
      setSubmitted(true);
    } catch (cause) {
      setError(authErrorMessage(cause, tErrors));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      {submitted ? (
        <>
          <AuthHeading
            eyebrow={t('forgotPassword.eyebrow')}
            title={t('forgotPassword.submitted.title')}
            description={t('forgotPassword.submitted.description')}
          />
          <div className="space-y-4">
            <AuthFeedback tone="success">{t('forgotPassword.submitted.notice')}</AuthFeedback>
            <Link
              href="/login"
              className="block text-center text-sm font-semibold text-primary hover:text-primary-hover"
            >
              {t('common.backToLogin')}
            </Link>
          </div>
        </>
      ) : (
        <>
          <AuthHeading
            eyebrow={t('forgotPassword.eyebrow')}
            title={t('forgotPassword.title')}
            description={t('forgotPassword.description')}
          />
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <AuthField
              label={t('fields.email')}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t('fields.emailPlaceholder')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldError}
              required
            />
            {error && <AuthFeedback tone="error">{error}</AuthFeedback>}
            <SubmitButton pending={pending}>{t('forgotPassword.submit')}</SubmitButton>
          </form>
          <Link
            href="/login"
            className="mt-6 block text-center text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            {t('common.backToLogin')}
          </Link>
        </>
      )}
    </section>
  );
}
