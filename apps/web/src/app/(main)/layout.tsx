import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

/** Candidate-facing shell: fixed glass header (h-16 below `xl`, h-20 from `xl`) and footer. */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen w-full pt-16 xl:pt-20">{children}</main>
      <SiteFooter />
    </>
  );
}
