import type { Metadata } from 'next';
import { VerifyEmailFlow } from '@/components/auth/verify-email-flow';

export const metadata: Metadata = { title: 'Xác minh email | Launchly' };

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;
  return <VerifyEmailFlow token={token} />;
}
