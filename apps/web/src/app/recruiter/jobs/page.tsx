import { JOB_PUBLICATION_STATUSES, type JobPublicationStatus } from '@launchly/shared';
import { RecruiterJobList, type StatusFilter } from '@/components/recruiter/recruiter-job-list';

type SearchParams = Promise<{ status?: string | string[]; submitted?: string | string[] }>;

const single = (value: string | string[] | undefined) =>
  typeof value === 'string' ? value : undefined;

function parseStatusFilter(value: string | undefined): StatusFilter {
  return (JOB_PUBLICATION_STATUSES as readonly string[]).includes(value ?? '')
    ? (value as JobPublicationStatus)
    : 'ALL';
}

export default async function RecruiterJobsPage({ searchParams }: { searchParams: SearchParams }) {
  const { status, submitted } = await searchParams;
  return (
    <RecruiterJobList
      initialStatus={parseStatusFilter(single(status))}
      submittedId={single(submitted)}
    />
  );
}
