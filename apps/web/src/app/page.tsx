import { healthResponseSchema } from '@launchly/shared';

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
      <div className="rounded-card bg-surface p-6 shadow-card">
        <h1 className="font-display text-headline-md">Launchly</h1>
        <p className="mt-2 text-muted-foreground">
          API status:{' '}
          <span
            className={
              apiUp
                ? 'rounded-full bg-success-subtle px-2 py-0.5 text-label-md text-success'
                : 'rounded-full bg-danger-subtle px-2 py-0.5 text-label-md text-danger'
            }
          >
            {status}
          </span>
        </p>
      </div>
    </main>
  );
}
