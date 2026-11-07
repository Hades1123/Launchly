'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  loginSchema,
  messageResponseSchema,
  sessionResponseSchema,
} from '@launchly/shared';
import { AuthDivider, AuthFeedback, AuthField, AuthHeading, PasswordField, SubmitButton } from '@/components/auth/auth-ui';
import { GoogleAuthAction } from '@/components/auth/google-auth-action';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage, authRequest, AuthRequestError, safeReturnPath } from '@/lib/auth-api';

function fieldErrorsFromSchema(issues: Array<{ path: PropertyKey[] }>) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? '');
    if (field === 'email') errors.email = 'Vui lòng nhập địa chỉ email hợp lệ.';
    if (field === 'password') errors.password = 'Vui lòng nhập mật khẩu.';
  }
  return errors;
}

export function LoginForm({ returnTo }: { returnTo?: string }) {
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
      setFieldErrors(fieldErrorsFromSchema(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      const session = await authRequest('/login', sessionResponseSchema, {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      acceptSession(session.accessToken, session.user, session.expiresIn);
      router.replace(safeReturnPath(returnTo));
    } catch (cause) {
      setError(authErrorMessage(cause));
      setUnverified(
        cause instanceof AuthRequestError && cause.code === 'EMAIL_NOT_VERIFIED',
      );
    } finally {
      setPending(false);
    }
  }

  async function resendVerification() {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await authRequest('/resend-verification', messageResponseSchema, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setNotice(result.message);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      <AuthHeading
        eyebrow="Tài khoản"
        title="Đăng nhập"
        description="Tiếp tục với tài khoản Launchly của bạn."
      />

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="ban@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          required
        />
        <PasswordField
          id="password"
          name="password"
          label="Mật khẩu"
          trailingLabel={
            <Link
              href="/forgot-password"
              className="rounded-control text-xs font-semibold text-primary hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Quên mật khẩu?
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
            onClick={() => void resendVerification()}
            className="w-full rounded-control bg-primary-subtle px-3 py-2.5 text-sm font-semibold text-primary-subtle-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            Gửi lại email xác minh
          </button>
        )}

        <SubmitButton pending={pending}>Đăng nhập</SubmitButton>
      </form>

      <AuthDivider />
      <GoogleAuthAction returnTo={safeReturnPath(returnTo)} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link
          href={returnTo ? `/register?next=${encodeURIComponent(returnTo)}` : '/register'}
          className="font-semibold text-primary hover:text-primary-hover"
        >
          Tạo tài khoản
        </Link>
      </p>
    </section>
  );
}
