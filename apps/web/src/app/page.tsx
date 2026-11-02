import { healthResponseSchema } from '@launchly/shared';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let status = 'API không phản hồi';
  try {
    const res = await fetch(`${process.env.API_URL ?? 'http://localhost:4000'}/health`);
    status = healthResponseSchema.parse(await res.json()).status;
  } catch {
    // API chưa chạy
  }
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Launchly</h1>
      <p className="mt-2">API status: {status}</p>
    </main>
  );
}
