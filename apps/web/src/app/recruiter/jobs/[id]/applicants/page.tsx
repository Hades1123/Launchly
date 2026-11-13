import { ApplicantsTable } from '@/components/recruiter/applicants-table';

export default async function JobApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicantsTable jobId={id} />;
}
