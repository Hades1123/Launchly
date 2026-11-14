import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BrandLogo } from '@/components/layout/brand-logo';
import { MainNav, MobileMenu } from '@/components/layout/main-nav';
import { AuthHeaderActions } from '@/components/layout/auth-header-actions';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { Button } from '@/components/ui/button';

/** Placeholder unread count until notifications are wired to the API. */
const UNREAD_COUNT = 3;

/**
 * Fixed glass header: h-16 with a menu button below `xl`, h-20 with the inline menu from `xl`.
 * `(main)/layout.tsx` offsets content to match.
 */
export function SiteHeader() {
  const t = useTranslations('layout.header');

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface/80 shadow-card backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-page items-center gap-x-6 px-4 md:px-8">
        <div className="flex h-16 shrink-0 items-center xl:h-20">
          <BrandLogo />
        </div>

        <MainNav />

        <div className="flex h-16 min-w-0 flex-1 items-center justify-end gap-2 xl:h-20 xl:gap-3">
          <div className="relative shrink-0">
            <Button
              variant="ghost"
              className="p-2"
              aria-label={t('notifications', { count: UNREAD_COUNT })}
            >
              <Bell className="size-5" strokeWidth={1.5} aria-hidden />
            </Button>
            <span
              aria-hidden
              className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-danger font-mono text-xs leading-none text-primary-foreground"
            >
              {UNREAD_COUNT}
            </span>
          </div>

          <div className="shrink-0">
            <LanguageSwitcher />
          </div>

          <div className="shrink-0">
            <AuthHeaderActions />
          </div>

          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
