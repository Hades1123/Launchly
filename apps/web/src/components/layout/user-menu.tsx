'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { BriefcaseBusiness, ChevronDown, FileText, LogOut, UserRound } from 'lucide-react';
import type { UserDto } from '@launchly/shared';
import { AuthFeedback } from '@/components/auth/auth-ui';
import { useAuth } from '@/lib/auth-context';
import { ROLE_LABELS, authErrorMessage, userDisplayName, userInitials } from '@/lib/auth-helpers';
import { cn } from '@/lib/cn';

type MenuLink = { label: string; href: string; icon: ComponentType<{ className?: string }> };

function linksFor(role: UserDto['role']): MenuLink[] {
  if (role === 'RECRUITER') {
    return [{ label: 'Quản lý tuyển dụng', href: '/recruiter/jobs', icon: BriefcaseBusiness }];
  }
  if (role === 'CANDIDATE') {
    return [
      { label: 'Hồ sơ của tôi', href: '/profile', icon: UserRound },
      { label: 'Việc đã ứng tuyển', href: '/applications', icon: FileText },
    ];
  }
  return [];
}

const itemClass =
  'flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none';

/** Avatar button that opens the account menu: role-specific shortcuts and sign out. */
export function UserMenu({ user }: { user: UserDto }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function handleLogout() {
    setPending(true);
    setError(null);
    try {
      await logout();
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  const name = userDisplayName(user);

  return (
    <div ref={container} className="relative pl-2">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tài khoản ${name}`}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground">
          {userInitials(user)}
        </span>
        <span className="hidden max-w-36 truncate text-sm font-semibold text-foreground 2xl:block">
          {name}
        </span>
        <ChevronDown
          className={cn('size-4 text-subtle-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tài khoản"
          className="absolute top-full right-0 z-50 mt-2 w-72 rounded-card bg-surface p-2 shadow-card-hover"
        >
          <div className="flex items-center gap-3 rounded-control bg-surface-muted p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {userInitials(user)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              <p className="truncate text-xs text-subtle-foreground">{user.email}</p>
              <p className="mt-0.5 text-xs font-medium text-primary">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <div className="mt-2 space-y-0.5">
            {linksFor(user.role).map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                <Icon className="size-4 text-subtle-foreground" />
                {label}
              </Link>
            ))}
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => void handleLogout()}
              className={cn(itemClass, 'text-danger disabled:opacity-60')}
            >
              <LogOut className="size-4" aria-hidden />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute top-full right-0 z-10 mt-2 w-72">
          <AuthFeedback tone="error">{error}</AuthFeedback>
        </div>
      )}
    </div>
  );
}
