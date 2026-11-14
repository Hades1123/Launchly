import { getTranslations } from 'next-intl/server';
import { CompanyReview } from '@/components/admin/company-review';

export async function generateMetadata() {
  const t = await getTranslations('admin.metadata');
  return { title: t('companyReview') };
}

export default async function AdminCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompanyReview id={id} />;
}
