import { cn } from '@/lib/cn';

type WaveformProps = {
  /** Bar levels from 1 to 5. */
  levels: number[];
  tone: 'primary' | 'success';
  /** Bounce the bars to signal a live microphone. */
  live?: boolean;
  className?: string;
};

const barTone = { primary: 'bg-primary', success: 'bg-success' } as const;

/** Decorative audio level bars; heights are data, so they are set inline. */
export function Waveform({ levels, tone, live = false, className }: WaveformProps) {
  return (
    <div aria-hidden className={cn('flex h-6 items-center gap-1 overflow-hidden', className)}>
      {levels.map((level, index) => (
        <span
          key={index}
          className={cn(
            'w-1 shrink-0 rounded-full',
            barTone[tone],
            live && 'motion-safe:animate-bounce',
            !live && level < 4 && 'opacity-70',
          )}
          style={{
            height: `${level * 20}%`,
            animationDelay: live ? `${(index % 6) * 0.05}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
