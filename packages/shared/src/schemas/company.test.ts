import { describe, expect, it } from 'vitest';
import { createCompanySchema } from './company';

describe('createCompanySchema', () => {
  it('trims required fields and drops blank optional fields', () => {
    expect(
      createCompanySchema.parse({ name: ' Acme ', address: ' HCMC ', website: '   ' }),
    ).toEqual({
      name: 'Acme',
      address: 'HCMC',
      industry: undefined,
      companySize: undefined,
      website: undefined,
      logoUrl: undefined,
      description: undefined,
    });
  });

  it('keeps a filled optional field', () => {
    expect(
      createCompanySchema.parse({ name: 'Acme', address: 'HCMC', industry: ' IT ' }).industry,
    ).toBe('IT');
  });

  it('rejects a blank name', () => {
    expect(createCompanySchema.safeParse({ name: '  ', address: 'HCMC' }).success).toBe(false);
  });
});
