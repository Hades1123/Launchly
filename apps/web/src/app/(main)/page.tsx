import { FeatureGrid } from '@/components/landing/feature-grid';
import { HowItWorks } from '@/components/landing/how-it-works';
import { LandingHero } from '@/components/landing/landing-hero';
import { LatestJobs } from '@/components/landing/latest-jobs';
import { RecruiterBand } from '@/components/landing/recruiter-band';
import { searchJobs } from '@/lib/api/jobs';
import type { PublicJobListResponse } from '@launchly/shared';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Launchly · Việc làm đầu tiên cho sinh viên và người mới ra trường',
  description:
    'Tìm việc thực tập, Fresher và Junior, xem trước từng vòng tuyển dụng và kiểm tra CV với từng tin tuyển dụng.',
};

const LATEST_JOBS = 6;

/** The newest public jobs (the API sorts newest first); `null` when the API cannot be reached. */
async function loadLatestJobs(): Promise<PublicJobListResponse | null> {
  try {
    return await searchJobs({ limit: LATEST_JOBS }, { cache: 'no-store' });
  } catch (err) {
    console.warn('Latest jobs could not be loaded for the landing page:', err);
    return null;
  }
}

export default async function HomePage() {
  const latest = await loadLatestJobs();
  const total = latest?.pagination.total ?? 0;

  return (
    <>
      <LandingHero openPositions={total} />
      <LatestJobs jobs={latest?.data ?? []} total={total} />
      <FeatureGrid />
      <HowItWorks />
      <RecruiterBand />
    </>
  );
}
