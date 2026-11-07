import { Bell, Bookmark, Search } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { MainNav } from '@/components/layout/main-nav';
import { Button } from '@/components/ui/button';

// Placeholder until auth is implemented and provides the signed-in candidate.
const demoUser = { name: 'Nguyễn Minh Anh', headline: 'Fresher Frontend', initials: 'MA' };

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface/80 shadow-card backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-6 px-4 md:px-8">
        <div className="flex items-center gap-8">
          <BrandLogo />
          <MainNav />
        </div>

        <div className="flex max-w-xl flex-1 items-center justify-end gap-4">
          <form action="/jobs" role="search" className="relative hidden w-full max-w-xs md:block">
            <Search
              className="pointer-events-none absolute top-1/2 left-2 size-5 -translate-y-1/2 text-subtle-foreground"
              strokeWidth={1.5}
              aria-hidden
            />
            <input
              type="search"
              name="q"
              aria-label="Tìm việc làm"
              placeholder="Tìm vị trí, kỹ năng, công ty..."
              className="w-full rounded-control bg-surface-muted py-2 pr-4 pl-10 text-xs text-foreground transition-all placeholder:text-subtle-foreground focus:bg-surface focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </form>

          <div className="flex items-center gap-1">
            <Button variant="ghost" className="p-2" aria-label="Tin tuyển dụng đã lưu">
              <Bookmark className="size-5" strokeWidth={1.5} aria-hidden />
            </Button>
            <div className="relative">
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
          </div>

          <div className="flex items-center gap-2 pl-2">
            <div className="hidden text-right 2xl:block">
              <div className="font-display text-sm leading-tight font-semibold">
                {demoUser.name}
              </div>
              <div className="text-xs text-subtle-foreground">{demoUser.headline}</div>
            </div>
            <span
              aria-label={demoUser.name}
              className="flex size-8 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground ring-2 ring-primary-subtle"
            >
              {demoUser.initials}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
