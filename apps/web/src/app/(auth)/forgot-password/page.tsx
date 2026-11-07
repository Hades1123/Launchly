import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = { title: 'Quên mật khẩu | Launchly' };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
