import { Bell } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { MainNav } from '@/components/layout/main-nav';
import { AuthHeaderActions } from '@/components/layout/auth-header-actions';
import { Button } from '@/components/ui/button';

/**
 * Fixed glass header. From `xl` everything sits on one h-20 row; below it the menu wraps to a
 * second, sideways-scrolling h-12 row (h-28 in total). `(main)/layout.tsx` offsets content to match.
 */
export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface/80 shadow-card backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-page flex-wrap items-center gap-x-6 px-4 md:px-8">
        <div className="flex h-16 shrink-0 items-center xl:h-20">
          <BrandLogo />
        </div>

        <MainNav className="order-last h-12 w-full xl:order-none xl:h-20 xl:w-auto" />

        <div className="flex h-16 min-w-0 flex-1 items-center justify-end gap-3 xl:h-20">
          <div className="relative shrink-0">
            <Button variant="ghost" className="p-2" aria-label="Thông báo tiến độ (3 mới)">
              <Bell className="size-5" strokeWidth={1.5} aria-hidden />
            </Button>
            <span
              aria-hidden
              className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-danger font-mono text-xs leading-none text-primary-foreground"
            >
              3
            </span>
          </div>

          <div className="shrink-0">
            <AuthHeaderActions />
          </div>
        </div>
      </div>
    </header>
  );
}
