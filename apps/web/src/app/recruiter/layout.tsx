import type { ReactNode } from 'react';
import { RecruiterShell } from '@/components/recruiter/recruiter-shell';

export const metadata = { title: 'Quản lý tuyển dụng · Launchly' };

/** Recruiter workspace, separate from the candidate-facing shell. */
export default function RecruiterLayout({ children }: { children: ReactNode }) {
  return <RecruiterShell>{children}</RecruiterShell>;
}
