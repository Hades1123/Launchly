import { cn } from '@/lib/cn';

/*
 * Button tones used only by the interview workspace. `components/ui/button` has no neutral
 * filled or success variant yet; promote these there if another screen needs them.
 */
const tones = {
  neutral: 'bg-secondary text-secondary-foreground shadow-card hover:bg-surface-strong',
  success: 'bg-success text-primary-foreground shadow-card-hover hover:bg-success/90',
} as const;

export function actionButtonClasses(tone: keyof typeof tones, className?: string): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-semibold transition-colors',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
    tones[tone],
    className,
  );
}
