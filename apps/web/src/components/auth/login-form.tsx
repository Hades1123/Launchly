'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { loginSchema } from '@launchly/shared';
import { useTranslations } from 'next-intl';
import {
  AuthDivider,
  AuthFeedback,
  AuthField,
  AuthHeading,
  PasswordField,
  SubmitButton,
} from '@/components/auth/auth-ui';
import { GoogleAuthAction } from '@/components/auth/google-auth-action';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage, safeReturnPath } from '@/lib/auth-helpers';
import { login, resendVerification } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';

function fieldErrorsFromSchema(
  issues: Array<{ path: PropertyKey[] }>,
  messages: { email: string; password: string },
) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? '');
    if (field === 'email') errors.email = messages.email;
    if (field === 'password') errors.password = messages.password;
  }
  return errors;
}

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const { acceptSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setUnverified(false);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(
        fieldErrorsFromSchema(parsed.error.issues, {
          email: t('fields.emailInvalid'),
          password: t('fields.passwordRequired'),
        }),
      );
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      const session = await login(parsed.data);
      acceptSession(session.accessToken, session.user);
      router.replace(safeReturnPath(returnTo));
    } catch (cause) {
      setError(authErrorMessage(cause, tErrors));
      setUnverified(cause instanceof ApiError && cause.code === 'EMAIL_NOT_VERIFIED');
    } finally {
      setPending(false);
    }
  }

  async function handleResendVerification() {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await resendVerification({ email });
      setNotice(result.message);
    } catch (cause) {
      setError(authErrorMessage(cause, tErrors));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      <AuthHeading
        eyebrow={t('login.eyebrow')}
        title={t('login.title')}
        description={t('login.description')}
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
          error={fieldErrors.email}
          required
        />
        <PasswordField
          id="password"
          name="password"
          label={t('fields.password')}
          trailingLabel={
            <Link
              href="/forgot-password"
              className="rounded-control text-xs font-semibold text-primary hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {t('login.forgotPassword')}
            </Link>
          }
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          required
        />

        {error && <AuthFeedback tone="error">{error}</AuthFeedback>}
        {notice && <AuthFeedback tone="success">{notice}</AuthFeedback>}
        {unverified && (
          <button
            type="button"
            disabled={pending || !email}
            onClick={() => void handleResendVerification()}
            className="w-full rounded-control bg-primary-subtle px-3 py-2.5 text-sm font-semibold text-primary-subtle-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('common.resendVerification')}
          </button>
        )}

        <SubmitButton pending={pending}>{t('login.submit')}</SubmitButton>
      </form>

      <AuthDivider />
      <GoogleAuthAction returnTo={safeReturnPath(returnTo)} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('login.noAccount')}{' '}
        <Link
          href={returnTo ? `/register?next=${encodeURIComponent(returnTo)}` : '/register'}
          className="font-semibold text-primary hover:text-primary-hover"
        >
          {t('login.createAccount')}
        </Link>
      </p>
    </section>
  );
}
