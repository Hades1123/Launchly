'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import {
  messageResponseSchema,
  registerSchema,
  registrationRoleSchema,
} from '@launchly/shared';
import { AuthDivider, AuthFeedback, AuthField, AuthHeading, SubmitButton } from '@/components/auth/auth-ui';
import { GoogleAuthAction } from '@/components/auth/google-auth-action';
import { authErrorMessage, authRequest } from '@/lib/auth-api';

type RegistrationRole = 'CANDIDATE' | 'RECRUITER';

export function RegisterForm() {
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
        nextErrors.email = 'Vui lòng nhập địa chỉ email hợp lệ.';
      }
      if (password.length < 8 || password.length > 128) {
        nextErrors.password = 'Mật khẩu cần có từ 8 đến 128 ký tự.';
      }
      if (!parsedRole.success) nextErrors.role = 'Vui lòng chọn loại tài khoản.';
      setFieldErrors(nextErrors);
      return;
    }
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Mật khẩu nhập lại chưa khớp.' });
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      await authRequest('/register', messageResponseSchema, {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      setSubmitted(true);
    } catch (cause) {
      setError(authErrorMessage(cause));
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
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setNotice(result.message);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
        <AuthHeading
          eyebrow="Kiểm tra email"
          title="Xác minh tài khoản"
          description="Chúng tôi đã gửi liên kết xác minh nếu yêu cầu đăng ký được tiếp nhận."
        />
        <div className="space-y-4">
          <AuthFeedback tone="success">
            Kiểm tra hộp thư của <strong>{email.trim().toLowerCase()}</strong> để kích hoạt tài khoản.
          </AuthFeedback>
          {notice && <AuthFeedback tone="info">{notice}</AuthFeedback>}
          {error && <AuthFeedback tone="error">{error}</AuthFeedback>}
          <button
            type="button"
            disabled={pending}
            onClick={() => void resendVerification()}
            className="w-full rounded-control bg-primary-subtle px-4 py-3 text-sm font-semibold text-primary-subtle-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
          >
            {pending ? 'Đang gửi…' : 'Gửi lại email xác minh'}
          </button>
          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-primary hover:text-primary-hover"
          >
            Quay lại đăng nhập
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      <AuthHeading
        eyebrow="Bắt đầu"
        title="Tạo tài khoản"
        description="Chọn cách bạn muốn sử dụng Launchly."
      />

      <fieldset className="mb-5 space-y-2">
        <legend className="mb-2 text-sm font-semibold text-foreground">Loại tài khoản</legend>
        <div role="radiogroup" aria-label="Loại tài khoản" className="grid grid-cols-2 gap-3">
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
                  {item === 'CANDIDATE' ? 'Ứng viên' : 'Nhà tuyển dụng'}
                </span>
                <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                  {item === 'CANDIDATE' ? 'Tìm cơ hội phù hợp' : 'Tìm nhân sự phù hợp'}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

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
        <AuthField
          label="Mật khẩu"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
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
          placeholder="Nhập lại mật khẩu"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={fieldErrors.confirmPassword}
          required
        />
        {error && <AuthFeedback tone="error">{error}</AuthFeedback>}
        <SubmitButton pending={pending}>Tạo tài khoản</SubmitButton>
      </form>

      <AuthDivider />
      <GoogleAuthAction />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
          Đăng nhập
        </Link>
      </p>
    </section>
  );
}
