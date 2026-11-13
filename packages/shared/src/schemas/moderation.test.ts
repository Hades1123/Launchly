import { describe, expect, it } from 'vitest';
import {
  adminCompanyListQuerySchema,
  adminCompanySchema,
  moderationRejectSchema,
} from './moderation';

describe('moderationRejectSchema', () => {
  it.each(['', '   ', 'x'.repeat(1001)])('rejects reason %#', (reason) => {
    expect(moderationRejectSchema.safeParse({ reason }).success).toBe(false);
  });

  it('accepts and trims a reason', () => {
    expect(moderationRejectSchema.parse({ reason: ' ok ' })).toEqual({ reason: 'ok' });
  });
});

describe('adminCompanyListQuerySchema', () => {
  it('defaults status to PENDING', () => {
    expect(adminCompanyListQuerySchema.parse({})).toEqual({ status: 'PENDING' });
  });

  it('rejects an unknown status', () => {
    expect(adminCompanyListQuerySchema.safeParse({ status: 'DRAFT' }).success).toBe(false);
  });
});

describe('adminCompanySchema', () => {
  it('parses a pending company without review data', () => {
    const row = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Acme',
      address: null,
      industry: null,
      companySize: null,
      website: null,
      logoUrl: null,
      description: null,
      moderationStatus: 'PENDING',
      moderationReason: null,
      ownerEmail: 'owner@acme.test',
      reviewedAt: null,
      createdAt: '2026-11-13T00:00:00.000Z',
    };
    expect(adminCompanySchema.parse(row)).toEqual(row);
  });
});
