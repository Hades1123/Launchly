import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/button';

export default function JobNotFound() {
  const t = useTranslations('jobs.notFound');

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-muted text-subtle-foreground">
        <SearchX className="size-7" strokeWidth={1.5} aria-hidden />
      </span>
      <h1 className="font-display text-2xl font-semibold text-foreground">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      <Link href="/jobs" className={buttonClasses('primary')}>
        {t('back')}
      </Link>
    </div>
  );
}
