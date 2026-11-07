'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { resetPasswordSchema } from '@launchly/shared';
import { AuthFeedback, AuthField, AuthHeading, SubmitButton } from '@/components/auth/auth-ui';
import { authErrorMessage, authRequestNoContent, AuthRequestError } from '@/lib/auth-api';

export function ResetPasswordForm({ token }: { token?: string }) {
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
        ...(!token ? { password: 'Liên kết đặt lại không hợp lệ hoặc đã hết hạn.' } : {}),
        ...(password.length < 8 || password.length > 128
          ? { password: 'Mật khẩu cần có từ 8 đến 128 ký tự.' }
          : {}),
      });
      return;
    }
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Mật khẩu nhập lại chưa khớp.' });
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      await authRequestNoContent('/reset-password', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      window.history.replaceState(null, '', '/reset-password');
      setSuccess(true);
    } catch (cause) {
      setError(authErrorMessage(cause));
      if (cause instanceof AuthRequestError && cause.code === 'INVALID_OR_EXPIRED_TOKEN') {
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
          eyebrow="Mật khẩu"
          title="Mật khẩu đã được cập nhật"
          description="Đăng nhập bằng mật khẩu mới để tiếp tục."
        />
        <AuthFeedback tone="success">Các phiên đăng nhập trước đã được kết thúc.</AuthFeedback>
        <Link
          href="/login"
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Đăng nhập
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      <AuthHeading
        eyebrow="Mật khẩu"
        title={invalidToken ? 'Liên kết không hợp lệ' : 'Tạo mật khẩu mới'}
        description={
          !invalidToken
            ? 'Chọn mật khẩu mới có từ 8 đến 128 ký tự.'
            : 'Yêu cầu một liên kết đặt lại mật khẩu mới để tiếp tục.'
        }
      />
      {error && <div className="mb-4"><AuthFeedback tone="error">{error}</AuthFeedback></div>}
      {!invalidToken && token ? (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <AuthField
            label="Mật khẩu mới"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            required
          />
          <AuthField
            label="Nhập lại mật khẩu"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={fieldErrors.confirmPassword}
            required
          />
          <SubmitButton pending={pending}>Lưu mật khẩu mới</SubmitButton>
        </form>
      ) : (
        <Link
          href="/forgot-password"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Yêu cầu liên kết mới
        </Link>
      )}
      <Link
        href="/login"
        className="mt-5 block text-center text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        Quay lại đăng nhập
      </Link>
    </section>
  );
}
