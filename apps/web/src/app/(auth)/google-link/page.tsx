import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GoogleLinkFlow } from '@/components/auth/google-link-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.metadata');
  return { title: t('googleLink') };
}

type GoogleLinkPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function GoogleLinkPage({ searchParams }: GoogleLinkPageProps) {
  const { token } = await searchParams;
  return <GoogleLinkFlow token={token} />;
}
