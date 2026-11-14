'use client';

import { useTransition } from 'react';
import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LOCALE_COOKIE, type Locale } from '@/i18n/locale';

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Toggles between Vietnamese and English: saves the choice in a cookie and re-renders the page. */
export function LanguageSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next: Locale = locale === 'vi' ? 'en' : 'vi';

  function toggle() {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <Button
      variant="ghost"
      className="gap-1.5 px-2.5"
      onClick={toggle}
      disabled={pending}
      aria-label={t('header.switchLanguage', { language: t(`common.languages.${next}`) })}
    >
      <Languages className="size-5" strokeWidth={1.5} aria-hidden />
      <span className="font-mono text-xs uppercase">{locale}</span>
    </Button>
  );
}
