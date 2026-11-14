import { useTranslations } from 'next-intl';

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Circular match score meter: slate track plus a primary progress arc. */
export function MatchGauge({ score }: { score: number }) {
  const t = useTranslations('candidate.cvReview.gauge');
  const clamped = Math.min(100, Math.max(0, score));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div
      role="img"
      aria-label={t('label', { score: clamped })}
      className="relative flex size-44 shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          className="stroke-surface-strong"
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="stroke-primary"
        />
      </svg>
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl font-bold tracking-tight">{clamped}</span>
        <span className="font-mono text-xs text-subtle-foreground">{t('unit')}</span>
      </div>
    </div>
  );
}
