'use client';

import { useEffect, useState } from 'react';

function format(seconds: number): string {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

type CountdownTimerProps = { initialSeconds: number; totalSeconds: number };

/** Per-question answer timer. Counts down locally; the real session clock comes with the API. */
export function CountdownTimer({ initialSeconds, totalSeconds }: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span role="timer" aria-label={`Thời gian còn lại ${format(seconds)}`}>
      <span className="font-mono text-sm font-bold text-foreground">{format(seconds)}</span>{' '}
      <span className="font-mono text-xs text-subtle-foreground">/ {format(totalSeconds)}</span>
    </span>
  );
}
