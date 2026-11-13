import { describe, expect, it } from 'vitest';
import {
  INTERACTIVE_ROUND_FORMATS,
  PRACTICE_EXPIRY_HOURS,
  PRACTICE_QUESTIONS_PER_ROUND,
  isInteractiveRoundFormat,
} from './interview-practice';

describe('interview practice constants', () => {
  it('uses five questions per round and a 24 hour inactivity window', () => {
    expect(PRACTICE_QUESTIONS_PER_ROUND).toBe(5);
    expect(PRACTICE_EXPIRY_HOURS).toBe(24);
  });

  it('only ONLINE and PHONE are interactive', () => {
    expect([...INTERACTIVE_ROUND_FORMATS]).toEqual(['ONLINE', 'PHONE']);
    expect(isInteractiveRoundFormat('ONLINE')).toBe(true);
    expect(isInteractiveRoundFormat('PHONE')).toBe(true);
    expect(isInteractiveRoundFormat('ONSITE')).toBe(false);
    expect(isInteractiveRoundFormat('ASSIGNMENT')).toBe(false);
  });

  it('treats an unset or unknown format as not interactive', () => {
    expect(isInteractiveRoundFormat(null)).toBe(false);
    expect(isInteractiveRoundFormat(undefined)).toBe(false);
    expect(isInteractiveRoundFormat('VIDEO')).toBe(false);
  });
});
