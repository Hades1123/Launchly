'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  LogOut,
  PlusCircle,
  UsersRound,
} from 'lucide-react';
import type { CompanyDto, CompanyModerationStatus } from '@launchly/shared';
import { BrandLogo } from '@/components/layout/brand-logo';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { getMyCompany } from '@/lib/api/company';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth-context';
import { userDisplayName, userInitials } from '@/lib/auth-helpers';
import { cn } from '@/lib/cn';

export type RecruiterCompany =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'error'; text: string }
  | { kind: 'ready'; company: CompanyDto };

const CompanyContext = createContext<RecruiterCompany>({ kind: 'loading' });

/** The signed-in recruiter's company, loaded once by the recruiter shell. */
export function useRecruiterCompany(): RecruiterCompany {
  return useContext(CompanyContext);
}

const companyStatusView: Record<CompanyModerationStatus, { label: string; tone: BadgeTone }> = {
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
};

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Omitted while the screen is not built yet; the item renders as disabled. */
  href?: string;
  isActive?: (pathname: string) => boolean;
};

function navItems(company: RecruiterCompany): NavItem[] {
  const approved = company.kind === 'ready' && company.company.moderationStatus === 'APPROVED';
  return [
    {
      label: 'Tin tuyển dụng',
      icon: BriefcaseBusiness,
      href: '/recruiter/jobs',
      isActive: (p) => p.startsWith('/recruiter/jobs') && p !== '/recruiter/jobs/new',
    },
    {
      label: 'Đăng tin mới',
      icon: PlusCircle,
      href: '/recruiter/jobs/new',
      isActive: (p) => p === '/recruiter/jobs/new',
    },
    { label: 'Ứng viên', icon: UsersRound },
    {
      label: 'Trang công ty',
      icon: Building2,
      href:
        company.kind === 'none'
          ? '/company/register'
          : approved
            ? `/companies/${company.company.id}`
            : undefined,
    },
  ];
}

const navBase =
  'flex items-center gap-3 rounded-control px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors';

function NavLinks({ company, pathname }: { company: RecruiterCompany; pathname: string }) {
  return (
    <>
      {navItems(company).map(({ label, icon: Icon, href, isActive }) => {
        if (!href) {
          return (
            <span
              key={label}
              aria-disabled="true"
              title="Sắp ra mắt"
              className={cn(navBase, 'cursor-not-allowed text-subtle-foreground')}
            >
              <Icon className="size-5" />
              {label}
            </span>
          );
        }
        const active = isActive?.(pathname) ?? false;
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              navBase,
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active
                ? 'bg-primary-subtle text-primary-subtle-foreground'
                : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

function CompanyCard({ company }: { company: RecruiterCompany }) {
  if (company.kind === 'loading') {
    return <div className="h-16 animate-pulse rounded-card bg-surface-muted" />;
  }
  if (company.kind !== 'ready') {
    return (
      <div className="rounded-card bg-surface-muted p-3 text-sm">
        <p className="font-semibold text-foreground">Chưa có công ty</p>
        <Link
          href="/company/register"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Đăng ký công ty
        </Link>
      </div>
    );
  }
  const view = companyStatusView[company.company.moderationStatus];
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface-muted p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface text-primary shadow-card">
        <Building2 className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{company.company.name}</p>
        <Badge tone={view.tone} shape="pill" className="mt-1">
          {view.label}
        </Badge>
      </div>
    </div>
  );
}

function GuardCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <BrandLogo />
      <div className="w-full max-w-md rounded-card bg-surface p-6 text-center shadow-card">
        {children}
      </div>
    </div>
  );
}

/** Recruiter workspace: sidebar on desktop, top bar on mobile. Only recruiters get past it. */
export function RecruiterShell({ children }: { children: ReactNode }) {
  const { status, user, logout } = useAuth();
  const pathname = usePathname();
  const [company, setCompany] = useState<RecruiterCompany>({ kind: 'loading' });
  const isRecruiter = status === 'authenticated' && user?.role === 'RECRUITER';

  useEffect(() => {
    if (!isRecruiter) return;
    let active = true;
    async function load() {
      try {
        const mine = await getMyCompany();
        if (active) setCompany({ kind: 'ready', company: mine });
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 404) setCompany({ kind: 'none' });
        else setCompany({ kind: 'error', text: 'Không thể tải thông tin công ty.' });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [isRecruiter]);

  if (status === 'loading') {
    return (
      <GuardCard>
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      </GuardCard>
    );
  }
  if (status !== 'authenticated' || !user) {
    return (
      <GuardCard>
        <p className="text-sm text-muted-foreground">
          Vui lòng đăng nhập bằng tài khoản nhà tuyển dụng.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className={buttonClasses('primary', 'mt-4')}
        >
          Đăng nhập
        </Link>
      </GuardCard>
    );
  }
  if (!isRecruiter) {
    return (
      <GuardCard>
        <p className="font-semibold text-foreground">Khu vực dành cho nhà tuyển dụng</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tài khoản của bạn không có quyền truy cập trang quản lý tuyển dụng.
        </p>
        <Link href="/jobs" className={buttonClasses('soft', 'mt-4')}>
          Về trang việc làm
        </Link>
      </GuardCard>
    );
  }

  const name = userDisplayName(user);

  return (
    <CompanyContext.Provider value={company}>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 bg-surface p-4 shadow-card lg:flex">
          <div className="space-y-1 px-2 pt-2">
            <BrandLogo />
            <p className="text-xs font-semibold tracking-wide text-subtle-foreground uppercase">
              Nhà tuyển dụng
            </p>
          </div>
          <CompanyCard company={company} />
          <nav aria-label="Quản lý tuyển dụng" className="flex flex-col gap-1">
            <NavLinks company={company} pathname={pathname} />
          </nav>
          <div className="mt-auto space-y-3">
            <Link
              href="/jobs"
              className={cn(navBase, 'text-muted-foreground hover:bg-surface-muted')}
            >
              <ArrowLeft className="size-5" />
              Về trang việc làm
            </Link>
            <div className="flex items-center gap-3 rounded-card bg-surface-muted p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground">
                {userInitials(user)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                <p className="truncate text-xs text-subtle-foreground">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="rounded-control p-2 text-muted-foreground hover:bg-secondary hover:text-danger focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <LogOut className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </aside>

        <header className="sticky top-0 z-40 bg-surface/90 shadow-card backdrop-blur-xl lg:hidden">
          <div className="flex h-16 items-center justify-between gap-3 px-4">
            <BrandLogo />
            <Link href="/jobs" className={buttonClasses('ghost', 'px-2')}>
              <ChevronLeft className="size-4" aria-hidden /> Trang việc làm
            </Link>
          </div>
          <nav aria-label="Quản lý tuyển dụng" className="flex gap-1 overflow-x-auto px-4 pb-3">
            <NavLinks company={company} pathname={pathname} />
          </nav>
        </header>

        <main className="px-4 py-8 md:px-8 lg:pl-72">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </CompanyContext.Provider>
  );
}

/** Title row of a recruiter page, with an optional back link and actions. */
export function RecruiterPageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1">
        {back && (
          <Link
            href={back.href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden /> {back.label}
          </Link>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
