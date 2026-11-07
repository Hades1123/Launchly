'use client';

import { ListChecks } from 'lucide-react';
import { useState } from 'react';

type PrepChecklistProps = {
  title: string;
  items: Array<{ label: string; done: boolean }>;
};

/** Client component so the "x/y done" counter follows the checkboxes. Not persisted yet. */
export function PrepChecklist({ title, items }: PrepChecklistProps) {
  const [done, setDone] = useState(() => items.map((item) => item.done));
  const doneCount = done.filter(Boolean).length;

  return (
    <section className="rounded-card bg-surface-muted p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1 font-display text-sm font-semibold">
          <ListChecks className="size-5 text-success" strokeWidth={1.75} aria-hidden />
          {title}
        </h3>
        <span className="font-mono text-xs text-muted-foreground" aria-live="polite">
          {doneCount}/{items.length} hoàn tất
        </span>
      </div>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={item.label}>
            <label className="flex cursor-pointer items-center gap-2 rounded bg-surface p-1 has-focus-visible:ring-2 has-focus-visible:ring-ring">
              <input
                type="checkbox"
                checked={done[index]}
                onChange={(event) =>
                  setDone((prev) =>
                    prev.map((value, i) => (i === index ? event.target.checked : value)),
                  )
                }
                className="peer size-4 shrink-0 accent-primary"
              />
              <span className="text-xs text-foreground peer-checked:text-muted-foreground peer-checked:line-through">
                {item.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
