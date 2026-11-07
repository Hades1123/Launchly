'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

type NavItem = {
  label: string;
  /** Omitted while the screen is not built yet; the item renders as disabled. */
  href?: string;
  badge?: { text: string; tone: 'success' | 'primary' };
};

const items: NavItem[] = [
  { label: 'Khám phá việc làm', href: '/jobs', badge: { text: 'Fresher', tone: 'success' } },
  { label: 'AI Đánh giá CV', href: '/cv-review', badge: { text: 'AI', tone: 'primary' } },
  { label: 'Luyện phỏng vấn AI', href: '/interview-practice' },
  { label: 'Hồ sơ của tôi', href: '/applications' },
];

const base =
  'flex items-center gap-1 rounded-control px-4 py-2 text-sm font-semibold transition-colors';

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 xl:flex">
      {items.map((item) => {
        const badge = item.badge && (
          <Badge
            tone={item.badge.tone}
            shape="pill"
            className={item.badge.tone === 'primary' ? 'shadow-glow' : undefined}
          >
            {item.badge.text}
          </Badge>
        );

        if (!item.href) {
          return (
            <span
              key={item.label}
              aria-disabled="true"
              title="Sắp ra mắt"
              className={cn(base, 'cursor-not-allowed text-subtle-foreground')}
            >
              {item.label}
              {badge}
            </span>
          );
        }

        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              base,
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            {item.label}
            {badge}
          </Link>
        );
      })}
    </nav>
  );
}
