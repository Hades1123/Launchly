import { CompanyReview } from '@/components/admin/company-review';

export const metadata = { title: 'Duyệt công ty · Launchly' };

export default async function AdminCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompanyReview id={id} />;
}
