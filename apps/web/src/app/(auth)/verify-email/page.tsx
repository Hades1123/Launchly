import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { VerifyEmailFlow } from '@/components/auth/verify-email-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.metadata');
  return { title: t('verifyEmail') };
}

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;
  return <VerifyEmailFlow token={token} />;
}
