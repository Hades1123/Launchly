'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type NavItem = { label: string; href: string };

const items: NavItem[] = [
  { label: 'Việc làm', href: '/jobs' },
  { label: 'Đánh giá CV', href: '/cv-review' },
  { label: 'Luyện phỏng vấn AI', href: '/interview-practice' },
  { label: 'Việc đã ứng tuyển', href: '/applications' },
  { label: 'Hồ sơ của tôi', href: '/profile' },
];

const focusRing = 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

function itemClass(active: boolean) {
  return active
    ? 'bg-primary text-primary-foreground'
    : 'text-muted-foreground hover:bg-secondary hover:text-foreground';
}

/** Candidate menu on one line, from `xl` up; smaller screens use `MobileMenu`. */
export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className={cn('hidden items-center gap-1 xl:flex', className)}
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-control px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
              focusRing,
              itemClass(active),
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Menu button below `xl`: opens the same items as a list under the header. */
export function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={container} className="xl:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? 'Đóng menu' : 'Mở menu'}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex size-11 items-center justify-center rounded-control text-foreground transition-colors hover:bg-secondary',
          focusRing,
        )}
      >
        {open ? (
          <X className="size-6" strokeWidth={1.75} aria-hidden />
        ) : (
          <Menu className="size-6" strokeWidth={1.75} aria-hidden />
        )}
      </button>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Điều hướng chính"
          className="absolute inset-x-0 top-full bg-surface px-4 py-3 shadow-card-hover md:px-8"
        >
          <ul className="mx-auto max-w-page space-y-1">
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex min-h-11 items-center rounded-control px-4 text-base font-semibold transition-colors',
                      focusRing,
                      itemClass(active),
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
