import { JOB_LEVELS, recruiterJobStatusFilterSchema, type JobLevel } from '@launchly/shared';
import { RecruiterJobList, type JobListFilters } from '@/components/recruiter/recruiter-job-list';

type Param = string | string[] | undefined;
type SearchParams = Promise<
  Record<'status' | 'q' | 'level' | 'page' | 'submitted' | 'deleted', Param>
>;

const single = (value: Param) => (typeof value === 'string' ? value : undefined);

/** Reads the list filters from the URL; anything invalid falls back to the default. */
function parseFilters(params: Awaited<SearchParams>): JobListFilters {
  const level = single(params.level);
  const page = Number(single(params.page));
  return {
    status: recruiterJobStatusFilterSchema.catch('ALL').parse(single(params.status) ?? 'ALL'),
    q: single(params.q)?.trim() ?? '',
    level: (JOB_LEVELS as readonly string[]).includes(level ?? '') ? (level as JobLevel) : '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export default async function RecruiterJobsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <RecruiterJobList
      initialFilters={parseFilters(params)}
      submittedId={single(params.submitted)}
      deleted={single(params.deleted) === '1'}
    />
  );
}
