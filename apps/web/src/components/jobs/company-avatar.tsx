import { cn } from '@/lib/cn';

type CompanyAvatarProps = { initials: string; size?: 'md' | 'lg' };

/** Initials tile used until companies have uploaded logos. */
export function CompanyAvatar({ initials, size = 'md' }: CompanyAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center bg-secondary font-display font-bold text-primary',
        size === 'lg'
          ? 'size-16 rounded-card text-xl shadow-card'
          : 'size-10 rounded-control text-sm',
      )}
    >
      {initials}
    </span>
  );
}
