const labels: Record<string, string> = {
  JOB_DESCRIPTION: 'From the job description',
  JOB_REQUIREMENTS: 'From the requirements',
  ROUND_PROCESS: 'From the interview round',
};

/** The readable label of where a generated question comes from. */
export function sourceLabel(source: string): string {
  return labels[source] ?? 'From the job';
}
