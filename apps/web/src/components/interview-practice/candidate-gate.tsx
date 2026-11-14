'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';

function Notice({ children }: { children: ReactNode }) {
  return <Card className="space-y-3 text-sm text-muted-foreground">{children}</Card>;
}

/** Practice belongs to a signed-in candidate; everyone else gets a short explanation. */
export function CandidateGate({ next, children }: { next: string; children: ReactNode }) {
  const { status, user } = useAuth();

  if (status === 'loading') return <Notice>Loading…</Notice>;
  if (status !== 'authenticated') {
    return (
      <Notice>
        <p>Log in as a candidate to practice interviews.</p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonClasses('primary')}>
          Log in to practice
        </Link>
      </Notice>
    );
  }
  if (user?.role !== 'CANDIDATE') return <Notice>Only candidates can practice interviews.</Notice>;
  return <>{children}</>;
}
