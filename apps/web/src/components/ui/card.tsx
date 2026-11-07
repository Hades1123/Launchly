import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardProps = { className?: string; children: ReactNode };

/** White panel on the tinted page background; depth comes from the surface shift plus a soft shadow. */
export function Card({ className, children }: CardProps) {
  return <div className={cn('rounded-card bg-surface p-6 shadow-card', className)}>{children}</div>;
}
