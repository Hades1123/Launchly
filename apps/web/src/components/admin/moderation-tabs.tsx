import Link from 'next/link';
import { cn } from '@/lib/cn';

export type ModerationTab = 'companies';

const tabs: { id: ModerationTab; label: string; href: string }[] = [
  { id: 'companies', label: 'Công ty', href: '/admin/moderation' },
];

/** Tab bar of the moderation page; SCRUM-74 adds the jobs tab. */
export function ModerationTabs({ active }: { active: ModerationTab }) {
  return (
    <div role="tablist" aria-label="Loại nội dung" className="flex gap-2 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          role="tab"
          aria-selected={tab.id === active}
          className={cn(
            '-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
            tab.id === active
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
