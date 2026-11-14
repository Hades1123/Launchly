'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { registerSchema, registrationRoleSchema } from '@launchly/shared';
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
import { authErrorMessage } from '@/lib/auth-helpers';
import { register, resendVerification } from '@/lib/api/auth';

type RegistrationRole = 'CANDIDATE' | 'RECRUITER';

export function RegisterForm() {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<RegistrationRole>('CANDIDATE');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const parsedRole = registrationRoleSchema.safeParse(role);
    const parsed = registerSchema.safeParse({
      email: normalizedEmail,
      password,
      role,
    });
    if (!parsed.success || !parsedRole.success) {
      const nextErrors: Record<string, string> = {};
      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        nextErrors.email = t('fields.emailInvalid');
      }
      if (password.length < 8 || password.length > 128) {
        nextErrors.password = t('fields.passwordLength');
      }
      if (!parsedRole.success) nextErrors.role = t('register.roleRequired');
      setFieldErrors(nextErrors);
      return;
    }
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: t('fields.confirmMismatch') });
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      await register(parsed.data);
      setSubmitted(true);
    } catch (cause) {
      setError(authErrorMessage(cause, tErrors));
    } finally {
      setPending(false);
    }
  }

  async function handleResendVerification() {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await resendVerification({ email: email.trim().toLowerCase() });
      setNotice(result.message);
    } catch (cause) {
      setError(authErrorMessage(cause, tErrors));
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
        <AuthHeading
          eyebrow={t('register.submitted.eyebrow')}
          title={t('register.submitted.title')}
          description={t('register.submitted.description')}
        />
        <div className="space-y-4">
          <AuthFeedback tone="success">
            {t.rich('register.submitted.checkInbox', {
              email: email.trim().toLowerCase(),
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </AuthFeedback>
          {notice && <AuthFeedback tone="info">{notice}</AuthFeedback>}
          {error && <AuthFeedback tone="error">{error}</AuthFeedback>}
          <button
            type="button"
            disabled={pending}
            onClick={() => void handleResendVerification()}
            className="w-full rounded-control bg-primary-subtle px-4 py-3 text-sm font-semibold text-primary-subtle-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
          >
            {pending ? t('register.submitted.sending') : t('common.resendVerification')}
          </button>
          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-primary hover:text-primary-hover"
          >
            {t('common.backToLogin')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      <AuthHeading
        eyebrow={t('register.eyebrow')}
        title={t('register.title')}
        description={t('register.description')}
      />

      <fieldset className="mb-5 space-y-2">
        <legend className="mb-2 text-sm font-semibold text-foreground">
          {t('register.roleLegend')}
        </legend>
        <div
          role="radiogroup"
          aria-label={t('register.roleLegend')}
          className="grid grid-cols-2 gap-3"
        >
          {(['CANDIDATE', 'RECRUITER'] as const).map((item) => {
            const selected = role === item;
            return (
              <label
                key={item}
                className={`min-h-20 cursor-pointer rounded-card p-3 text-left transition ${selected ? 'bg-primary-subtle text-primary-subtle-foreground ring-2 ring-primary' : 'bg-surface-muted text-foreground hover:bg-surface-strong'}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={item}
                  checked={selected}
                  onChange={() => setRole(item)}
                  className="sr-only"
                />
                <span className="block rounded-control text-sm font-semibold focus-within:ring-2 focus-within:ring-ring">
                  {t(`register.roles.${item}.title`)}
                </span>
                <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                  {t(`register.roles.${item}.description`)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

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
          label={t('fields.password')}
          name="password"
          autoComplete="new-password"
          placeholder={t('register.passwordPlaceholder')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          required
        />
        <PasswordField
          label={t('fields.confirmPassword')}
          name="confirmPassword"
          autoComplete="new-password"
          placeholder={t('register.confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={fieldErrors.confirmPassword}
          required
        />
        {error && <AuthFeedback tone="error">{error}</AuthFeedback>}
        <SubmitButton pending={pending}>{t('register.submit')}</SubmitButton>
      </form>

      <AuthDivider />
      <GoogleAuthAction />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('register.hasAccount')}{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
          {t('register.login')}
        </Link>
      </p>
    </section>
  );
}
