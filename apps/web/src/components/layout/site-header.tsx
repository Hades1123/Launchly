import { BrandLogo } from '@/components/layout/brand-logo';
import { MainNav, MobileMenu } from '@/components/layout/main-nav';
import { AuthHeaderActions } from '@/components/layout/auth-header-actions';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

/**
 * Fixed glass header: h-16 with a menu button below `xl`, h-20 with the inline menu from `xl`.
 * `(main)/layout.tsx` offsets content to match.
 */
export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface/80 shadow-card backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-page items-center gap-x-6 px-4 md:px-8">
        <div className="flex h-16 shrink-0 items-center xl:h-20">
          <BrandLogo />
        </div>

        <MainNav />

        <div className="flex h-16 min-w-0 flex-1 items-center justify-end gap-2 xl:h-20 xl:gap-3">
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
