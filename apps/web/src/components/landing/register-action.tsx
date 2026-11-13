'use client';

import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

/** The landing page's one sign-up button; hidden once the visitor is signed in. */
export function RegisterAction() {
  const { status } = useAuth();
  if (status === 'loading' || status === 'authenticated') return null;

  return (
    <Link href="/register" className={buttonClasses('soft', 'h-12 px-6')}>
      Tạo tài khoản
    </Link>
  );
}
