import { describe, expect, it } from 'vitest';
import { ROUND_FORMAT_LABELS, formatRoundDuration, roundMeta } from './job-round-format';

describe('round format labels', () => {
  it('has a readable label for every format', () => {
    expect(ROUND_FORMAT_LABELS).toEqual({
      ONLINE: 'Online',
      ONSITE: 'On-site',
      PHONE: 'Phone call',
      ASSIGNMENT: 'Take-home assignment',
    });
  });

  it('formats durations in minutes', () => {
    expect(formatRoundDuration(45)).toBe('45 min');
  });

  it('builds meta from what is present and never invents values', () => {
    expect(roundMeta({ format: 'ONLINE', estimatedDurationMinutes: 30 })).toEqual([
      'Online',
      '30 min',
    ]);
    expect(roundMeta({ format: null, estimatedDurationMinutes: 30 })).toEqual(['30 min']);
    expect(roundMeta({ format: 'PHONE', estimatedDurationMinutes: null })).toEqual(['Phone call']);
    expect(roundMeta({ format: null, estimatedDurationMinutes: null })).toEqual([]);
  });
});
