import type { Metadata } from 'next';
import { GoogleLinkFlow } from '@/components/auth/google-link-flow';

export const metadata: Metadata = { title: 'Xác nhận Google | Launchly' };

type GoogleLinkPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function GoogleLinkPage({ searchParams }: GoogleLinkPageProps) {
  const { token } = await searchParams;
  return <GoogleLinkFlow token={token} />;
}
