import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const tones = {
  neutral: 'bg-surface-strong text-foreground',
  primary: 'bg-primary-subtle text-primary-subtle-foreground',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
} as const;

export type BadgeTone = keyof typeof tones;

type BadgeProps = {
  tone?: BadgeTone;
  /** `pill` for status/level badges, `tag` for skill and perk tags. */
  shape?: 'pill' | 'tag';
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = 'neutral', shape = 'tag', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        shape === 'pill' ? 'rounded-full' : 'rounded',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
