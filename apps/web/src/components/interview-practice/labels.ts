import { PRACTICE_GENERAL_ROUND_NAME, type PracticeRoundDto } from '@launchly/shared';

const SOURCES = ['JOB_DESCRIPTION', 'JOB_REQUIREMENTS', 'ROUND_PROCESS'] as const;

/** Message key under `sources` for where a generated question comes from. */
export function sourceKey(source: string): (typeof SOURCES)[number] | 'other' {
  return (SOURCES as readonly string[]).includes(source)
    ? (source as (typeof SOURCES)[number])
    : 'other';
}

/** A quick practice's round has no stage; it is shown with a translated label, not its stored name. */
export function isGeneralRound(round: Pick<PracticeRoundDto, 'stageId' | 'name'>): boolean {
  return round.stageId === null && round.name === PRACTICE_GENERAL_ROUND_NAME;
}
