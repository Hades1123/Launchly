import { cn } from '@/lib/cn';

const tones = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
} as const;

type ProgressBarProps = { value: number; tone: keyof typeof tones; label: string };

export function ProgressBar({ value, tone, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-strong"
    >
      {/* Width is data-driven, so it is set inline rather than with a utility class. */}
      <div className={cn('h-full rounded-full', tones[tone])} style={{ width: `${clamped}%` }} />
    </div>
  );
}
