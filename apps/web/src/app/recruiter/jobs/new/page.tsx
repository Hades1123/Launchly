import { RecruiterPageHeader } from '@/components/recruiter/recruiter-shell';
import { JobPostingForm } from '@/components/recruiter/job-posting-form';

export default function NewJobPage() {
  return (
    <>
      <RecruiterPageHeader
        back={{ href: '/recruiter/jobs', label: 'Tin tuyển dụng' }}
        title="Đăng tin tuyển dụng"
        description="Mô tả công việc, quy trình và những lưu ý để ứng viên biết chính xác cách bạn tuyển người."
      />
      <JobPostingForm />
    </>
  );
}
