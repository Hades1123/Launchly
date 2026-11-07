import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

/** Candidate-facing shell: fixed glass header (h-20) and footer. */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen w-full pt-20">{children}</main>
      <SiteFooter />
    </>
  );
}
