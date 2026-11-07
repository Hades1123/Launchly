import { describe, expect, it } from 'vitest';
import {
  MAX_ROUNDS,
  replaceRoundsSchema,
  roundInputSchema,
  validateRoundDrafts,
} from './job-round';

const valid = { name: 'Screening', format: 'ONLINE', estimatedDurationMinutes: 30 };

describe('roundInputSchema', () => {
  it('accepts a valid round and trims the name', () => {
    expect(roundInputSchema.parse({ ...valid, name: '  Screening  ' }).name).toBe('Screening');
  });

  it.each(['', '   '])('rejects blank name %j', (name) => {
    expect(roundInputSchema.safeParse({ ...valid, name }).success).toBe(false);
  });

  it('enforces name length 100', () => {
    expect(roundInputSchema.safeParse({ ...valid, name: 'a'.repeat(100) }).success).toBe(true);
    expect(roundInputSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('rejects unknown format', () => {
    expect(roundInputSchema.safeParse({ ...valid, format: 'TELEPATHY' }).success).toBe(false);
  });

  it.each([
    [4, false],
    [5, true],
    [480, true],
    [481, false],
    [30.5, false],
  ])('duration %s -> valid=%s', (estimatedDurationMinutes, ok) => {
    expect(roundInputSchema.safeParse({ ...valid, estimatedDurationMinutes }).success).toBe(ok);
  });
});

describe('replaceRoundsSchema', () => {
  it('allows an empty list and up to MAX_ROUNDS rounds', () => {
    expect(replaceRoundsSchema.safeParse({ rounds: [] }).success).toBe(true);
    const rounds = Array.from({ length: MAX_ROUNDS }, () => valid);
    expect(replaceRoundsSchema.safeParse({ rounds }).success).toBe(true);
    expect(replaceRoundsSchema.safeParse({ rounds: [...rounds, valid] }).success).toBe(false);
  });
});

describe('validateRoundDrafts', () => {
  const ok = { name: 'Screening', format: 'PHONE', duration: '20' };

  it('returns no errors for valid drafts', () => {
    expect(validateRoundDrafts([ok, ok])).toEqual([{}, {}]);
  });

  it('flags every invalid field of every draft at once', () => {
    const blank = { name: ' ', format: '', duration: '' };
    expect(validateRoundDrafts([blank, ok, blank])).toEqual([
      { name: true, format: true, duration: true },
      {},
      { name: true, format: true, duration: true },
    ]);
  });

  it.each(['abc', '0', '4', '481', '12.5', '1e2x'])('flags duration %j', (duration) => {
    expect(validateRoundDrafts([{ ...ok, duration }])).toEqual([{ duration: true }]);
  });

  it.each(['5', '480', ' 60 '])('accepts duration %j', (duration) => {
    expect(validateRoundDrafts([{ ...ok, duration }])).toEqual([{}]);
  });
});
