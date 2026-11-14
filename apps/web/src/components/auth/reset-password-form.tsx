'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { resetPasswordSchema } from '@launchly/shared';
import { useTranslations } from 'next-intl';
import { AuthFeedback, AuthHeading, PasswordField, SubmitButton } from '@/components/auth/auth-ui';
import { authErrorMessage } from '@/lib/auth-helpers';
import { resetPassword } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';

export function ResetPasswordForm({ token }: { token?: string }) {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(!token);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setFieldErrors({
        ...(!token ? { password: t('resetPassword.invalidLink') } : {}),
        ...(password.length < 8 || password.length > 128
          ? { password: t('fields.passwordLength') }
          : {}),
      });
      return;
    }
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: t('fields.confirmMismatch') });
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      await resetPassword(parsed.data);
      window.history.replaceState(null, '', '/reset-password');
      setSuccess(true);
    } catch (cause) {
      setError(authErrorMessage(cause, tErrors));
      if (cause instanceof ApiError && cause.code === 'INVALID_OR_EXPIRED_TOKEN') {
        window.history.replaceState(null, '', '/reset-password');
        setInvalidToken(true);
      }
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
        <AuthHeading
          eyebrow={t('resetPassword.eyebrow')}
          title={t('resetPassword.success.title')}
          description={t('resetPassword.success.description')}
        />
        <AuthFeedback tone="success">{t('resetPassword.success.notice')}</AuthFeedback>
        <Link
          href="/login"
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t('common.login')}
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      <AuthHeading
        eyebrow={t('resetPassword.eyebrow')}
        title={invalidToken ? t('resetPassword.invalidTitle') : t('resetPassword.title')}
        description={
          !invalidToken ? t('resetPassword.description') : t('resetPassword.invalidDescription')
        }
      />
      {error && (
        <div className="mb-4">
          <AuthFeedback tone="error">{error}</AuthFeedback>
        </div>
      )}
      {!invalidToken && token ? (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <PasswordField
            label={t('resetPassword.newPassword')}
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            required
          />
          <PasswordField
            label={t('fields.confirmPassword')}
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={fieldErrors.confirmPassword}
            required
          />
          <SubmitButton pending={pending}>{t('resetPassword.submit')}</SubmitButton>
        </form>
      ) : (
        <Link
          href="/forgot-password"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t('resetPassword.requestNewLink')}
        </Link>
      )}
      <Link
        href="/login"
        className="mt-5 block text-center text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        {t('common.backToLogin')}
      </Link>
    </section>
  );
}
