import { RoundsBuilder } from '@/components/recruiter/rounds-builder';

export default async function JobRoundsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Quy trình tuyển dụng
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thêm, sắp xếp và xóa các vòng tuyển dụng cho tin này. Ứng viên sẽ thấy các vòng theo đúng
          thứ tự.
        </p>
      </header>
      <RoundsBuilder jobId={id} />
    </main>
  );
}
