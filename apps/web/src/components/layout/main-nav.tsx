'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

type NavItem = { label: string; href: string };

const items: NavItem[] = [
  { label: 'Khám phá', href: '/jobs' },
  { label: 'Đánh giá CV', href: '/cv-review' },
  { label: 'Luyện phỏng vấn AI', href: '/interview-practice' },
  { label: 'Việc đã ứng tuyển', href: '/applications' },
  { label: 'Hồ sơ của tôi', href: '/profile' },
];

/** Candidate menu: one line on desktop, a sideways-scrolling row on smaller screens. */
export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className={cn('flex items-center gap-1 overflow-x-auto', className)}
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-control px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
