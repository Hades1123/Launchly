import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { RecruiterShell } from '@/components/recruiter/recruiter-shell';

export async function generateMetadata() {
  const t = await getTranslations('recruiter.metadata');
  return { title: t('title') };
}

/** Recruiter workspace, separate from the candidate-facing shell. */
export default function RecruiterLayout({ children }: { children: ReactNode }) {
  return <RecruiterShell>{children}</RecruiterShell>;
}
