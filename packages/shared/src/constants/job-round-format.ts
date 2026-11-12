import type { RoundFormat } from '../schemas/job-round';

/** Candidate-facing names for each round format. One place, used by the builder and the timeline. */
export const ROUND_FORMAT_LABELS: Record<RoundFormat, string> = {
  ONLINE: 'Online',
  ONSITE: 'On-site',
  PHONE: 'Phone call',
  ASSIGNMENT: 'Take-home assignment',
};

export function formatRoundDuration(minutes: number): string {
  return `${minutes} min`;
}

/** The text pieces a round shows next to its name; missing values are left out, never invented. */
export function roundMeta(round: {
  format: RoundFormat | null;
  estimatedDurationMinutes: number | null;
}): string[] {
  const meta: string[] = [];
  if (round.format) meta.push(ROUND_FORMAT_LABELS[round.format]);
  if (round.estimatedDurationMinutes !== null) {
    meta.push(formatRoundDuration(round.estimatedDurationMinutes));
  }
  return meta;
}
