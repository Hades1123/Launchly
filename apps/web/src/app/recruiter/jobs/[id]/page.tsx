import { RecruiterJobDetail } from '@/components/recruiter/recruiter-job-detail';

export default async function RecruiterJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecruiterJobDetail key={id} jobId={id} />;
}
