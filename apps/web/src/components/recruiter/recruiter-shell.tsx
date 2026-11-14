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
import { useTranslations } from 'next-intl';
import type { CompanyDto, CompanyModerationStatus } from '@launchly/shared';
import { BrandLogo } from '@/components/layout/brand-logo';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
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

const companyStatusTone: Record<CompanyModerationStatus, BadgeTone> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
};

type ShellT = ReturnType<typeof useTranslations<'recruiter.shell'>>;

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Omitted while the screen is not built yet; the item renders as disabled. */
  href?: string;
  isActive?: (pathname: string) => boolean;
};

function navItems(company: RecruiterCompany, t: ShellT): NavItem[] {
  const approved = company.kind === 'ready' && company.company.moderationStatus === 'APPROVED';
  return [
    {
      label: t('nav.jobs'),
      icon: BriefcaseBusiness,
      href: '/recruiter/jobs',
      isActive: (p) => p.startsWith('/recruiter/jobs') && p !== '/recruiter/jobs/new',
    },
    {
      label: t('nav.newJob'),
      icon: PlusCircle,
      href: '/recruiter/jobs/new',
      isActive: (p) => p === '/recruiter/jobs/new',
    },
    { label: t('nav.applicants'), icon: UsersRound },
    {
      label: t('nav.companyPage'),
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
  const t = useTranslations('recruiter.shell');
  return (
    <>
      {navItems(company, t).map(({ label, icon: Icon, href, isActive }) => {
        if (!href) {
          return (
            <span
              key={label}
              aria-disabled="true"
              title={t('nav.comingSoon')}
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
  const t = useTranslations('recruiter.shell');
  if (company.kind === 'loading') {
    return <div className="h-16 animate-pulse rounded-card bg-surface-muted" />;
  }
  if (company.kind !== 'ready') {
    return (
      <div className="rounded-card bg-surface-muted p-3 text-sm">
        <p className="font-semibold text-foreground">{t('company.none')}</p>
        <Link
          href="/company/register"
          className="text-xs font-semibold text-primary hover:underline"
        >
          {t('company.register')}
        </Link>
      </div>
    );
  }
  const status = company.company.moderationStatus;
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface-muted p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface text-primary shadow-card">
        <Building2 className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{company.company.name}</p>
        <Badge tone={companyStatusTone[status]} shape="pill" className="mt-1">
          {t(`companyStatus.${status}`)}
        </Badge>
        <RejectedCompanyNotice company={company} />
      </div>
    </div>
  );
}

/** Rejection reason and the way forward, shown in the sidebar and in the mobile header. */
function RejectedCompanyNotice({ company }: { company: RecruiterCompany }) {
  const t = useTranslations('recruiter.shell.company');
  if (company.kind !== 'ready' || company.company.moderationStatus !== 'REJECTED') return null;
  return (
    <div className="mt-2 space-y-1">
      {company.company.moderationReason && (
        <p className="text-xs break-words text-danger">
          {t('reason', { reason: company.company.moderationReason })}
        </p>
      )}
      <Link
        href="/company/register"
        className="block rounded-control text-xs font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {t('registerOther')}
      </Link>
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
  const t = useTranslations('recruiter.shell');
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
        else setCompany({ kind: 'error', text: t('company.loadError') });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [isRecruiter, t]);

  if (status === 'loading') {
    return (
      <GuardCard>
        <p className="text-sm text-muted-foreground">{t('guard.loading')}</p>
      </GuardCard>
    );
  }
  if (status !== 'authenticated' || !user) {
    return (
      <GuardCard>
        <p className="text-sm text-muted-foreground">{t('guard.signInPrompt')}</p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className={buttonClasses('primary', 'mt-4')}
        >
          {t('guard.signIn')}
        </Link>
      </GuardCard>
    );
  }
  if (!isRecruiter) {
    return (
      <GuardCard>
        <p className="font-semibold text-foreground">{t('guard.recruitersOnly')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('guard.noAccess')}</p>
        <Link href="/jobs" className={buttonClasses('soft', 'mt-4')}>
          {t('guard.backToJobs')}
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
              {t('eyebrow')}
            </p>
          </div>
          <CompanyCard company={company} />
          <nav aria-label={t('nav.label')} className="flex flex-col gap-1">
            <NavLinks company={company} pathname={pathname} />
          </nav>
          <div className="mt-auto space-y-3">
            <div className="flex items-center gap-1">
              <Link
                href="/jobs"
                className={cn(navBase, 'flex-1 text-muted-foreground hover:bg-surface-muted')}
              >
                <ArrowLeft className="size-5" />
                {t('backToJobs')}
              </Link>
              <LanguageSwitcher />
            </div>
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
                aria-label={t('logout')}
                title={t('logout')}
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
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <Link href="/jobs" className={buttonClasses('ghost', 'px-2')}>
                <ChevronLeft className="size-4" aria-hidden /> {t('jobsPage')}
              </Link>
            </div>
          </div>
          {company.kind === 'ready' && company.company.moderationStatus === 'REJECTED' && (
            <div className="mx-4 mb-3 rounded-card bg-danger-subtle p-3">
              <p className="text-xs font-semibold text-danger">
                {t('company.rejected', { name: company.company.name })}
              </p>
              <RejectedCompanyNotice company={company} />
            </div>
          )}
          <nav aria-label={t('nav.label')} className="flex gap-1 overflow-x-auto px-4 pb-3">
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
