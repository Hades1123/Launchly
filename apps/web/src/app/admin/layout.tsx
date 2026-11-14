import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/admin-shell';

export async function generateMetadata() {
  const t = await getTranslations('admin.metadata');
  return { title: t('admin') };
}

/** Admin area, separate from the candidate and recruiter shells. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
