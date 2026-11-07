import Link from 'next/link';
import { Rocket } from 'lucide-react';

export function BrandLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-control focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="flex size-8 items-center justify-center rounded-control bg-primary text-primary-foreground">
        <Rocket className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight text-primary">
        Launchly
      </span>
    </Link>
  );
}
