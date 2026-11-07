import Link from 'next/link';
import { healthResponseSchema } from '@launchly/shared';
import { buttonClasses } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let status = 'API không phản hồi';
  let apiUp = false;
  try {
    const res = await fetch(`${process.env.API_URL ?? 'http://localhost:4000'}/health`);
    status = healthResponseSchema.parse(await res.json()).status;
    apiUp = true;
  } catch {
    // API is not running
  }
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h1 className="font-display text-2xl font-bold">Launchly</h1>
        <p className="mt-2 text-muted-foreground">
          API status:{' '}
          <span
            className={
              apiUp
                ? 'rounded-control bg-success-subtle px-2 py-0.5 font-medium text-success'
                : 'rounded-control bg-danger-subtle px-2 py-0.5 font-medium text-danger'
            }
          >
            {status}
          </span>
        </p>
        <Link href="/jobs" className={buttonClasses('primary', 'mt-6')}>
          Khám phá việc làm
        </Link>
      </div>
    </main>
  );
}
