export const PRACTICE_QUESTIONS_PER_ROUND = 5;
export const PRACTICE_EXPIRY_HOURS = 24;

/** Stored name of the QUICK scope's round; the web app shows its own translated label. */
export const PRACTICE_GENERAL_ROUND_NAME = 'General interview';

/**
 * Round formats that run as an interactive Q&A practice round. Other formats (on-site,
 * take-home assignment, or a format that is not set) are shown as information only.
 */
export const INTERACTIVE_ROUND_FORMATS = ['ONLINE', 'PHONE'] as const;

export function isInteractiveRoundFormat(format: string | null | undefined): boolean {
  return (INTERACTIVE_ROUND_FORMATS as readonly string[]).includes(format ?? '');
}

/** Shown with every round feedback and summary so the UI never retypes it. */
export const PRACTICE_FEEDBACK_DISCLAIMER =
  'AI-generated practice feedback is advisory and may be incorrect; it does not affect hiring decisions.';
