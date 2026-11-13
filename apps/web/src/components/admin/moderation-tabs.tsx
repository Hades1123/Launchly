import Link from 'next/link';
import { cn } from '@/lib/cn';

export type ModerationTab = 'companies' | 'jobs';

const tabs: { id: ModerationTab; label: string; href: string }[] = [
  { id: 'companies', label: 'Công ty', href: '/admin/moderation' },
  { id: 'jobs', label: 'Tin tuyển dụng', href: '/admin/moderation/jobs' },
];

/** Links between the moderation queues (page navigation, so a nav, not an ARIA tab widget). */
export function ModerationTabs({ active }: { active: ModerationTab }) {
  return (
    <nav aria-label="Loại nội dung" className="flex gap-2 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === active ? 'page' : undefined}
          className={cn(
            '-mb-px rounded-t-control border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            tab.id === active
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
