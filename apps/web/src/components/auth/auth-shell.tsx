import Link from 'next/link';
import { ArrowUpRight, Rocket } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export function AuthShell({ children }: { children: ReactNode }) {
  const t = useTranslations('auth.shell');
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-14">
        <Link
          href="/"
          className="relative z-10 inline-flex w-fit items-center gap-2 rounded-control font-display text-xl font-bold tracking-tight focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:outline-none"
        >
          <Rocket className="size-6" strokeWidth={1.75} aria-hidden />
          Launchly
        </Link>

        <div className="relative z-10 max-w-md pb-10">
          <p className="mb-4 text-sm font-medium tracking-wide text-primary-foreground/70">
            {t('eyebrow')}
          </p>
          <h1 className="font-display text-4xl leading-tight font-bold xl:text-5xl">
            {t('headlineLine1')}
            <br />
            {t('headlineLine2')}
          </h1>
        </div>

        <div aria-hidden className="pointer-events-none absolute top-1/4 -right-28 size-96">
          <div className="absolute inset-0 rounded-full border border-primary-foreground/10" />
          <div className="absolute inset-12 rounded-full border border-primary-foreground/10" />
          <div className="absolute inset-24 rounded-full border border-primary-foreground/10" />
          <span className="absolute top-12 right-20 size-3 rounded-full bg-primary-subtle" />
          <span className="absolute bottom-20 left-16 size-2 rounded-full bg-primary-foreground/70" />
          <ArrowUpRight className="absolute right-32 bottom-28 size-12 text-primary-foreground/70" />
        </div>

        <p className="relative z-10 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Launchly
        </p>
      </aside>

      <main className="flex min-h-screen flex-col bg-background px-5 py-6 sm:px-8 lg:px-12 lg:py-12">
        <div className="mb-10 flex items-center justify-between lg:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-control font-display text-lg font-bold tracking-tight text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="flex size-8 items-center justify-center rounded-control bg-primary text-primary-foreground">
              <Rocket className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            Launchly
          </Link>
          <Link
            href="/"
            className="rounded-control px-2 py-1 text-sm font-medium text-muted-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t('home')}
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center lg:min-h-screen">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
