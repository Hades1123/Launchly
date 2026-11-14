'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tab = { key: string; label: string; content: ReactNode };

/**
 * Tabs whose panels stay mounted once opened, so switching never drops unsaved answers. A panel
 * is first rendered when its tab is opened, so a tab that loads data only loads on demand.
 */
export function PracticeTabs({ label, tabs }: { label: string; tabs: Tab[] }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const [opened, setOpened] = useState<Set<number>>(() => new Set([0]));

  function open(index: number) {
    setActive(index);
    setOpened((current) => (current.has(index) ? current : new Set(current).add(index)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = (active + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    open(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex gap-6 border-b border-border"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            id={`${id}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => open(index)}
            className={cn(
              '-mb-px border-b-2 pb-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              index === active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.key}
          id={`${id}-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${index}`}
          hidden={index !== active}
        >
          {opened.has(index) && tab.content}
        </div>
      ))}
    </div>
  );
}
