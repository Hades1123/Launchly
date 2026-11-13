import { RecruiterPageHeader } from '@/components/recruiter/recruiter-shell';
import { RoundsBuilder } from '@/components/recruiter/rounds-builder';

export default async function JobRoundsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="max-w-3xl">
      <RecruiterPageHeader
        back={{ href: `/recruiter/jobs/${id}`, label: 'Chi tiết tin' }}
        title="Quy trình tuyển dụng"
        description="Thêm, sắp xếp và xóa các vòng tuyển dụng cho tin này. Ứng viên sẽ thấy các vòng theo đúng thứ tự."
      />
      <RoundsBuilder jobId={id} />
    </div>
  );
}
