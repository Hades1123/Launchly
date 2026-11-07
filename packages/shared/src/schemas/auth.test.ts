import { describe, expect, it } from 'vitest';
import {
  googleSignInResponseSchema,
  registerSchema,
  userDtoSchema,
} from './auth';

describe('registerSchema', () => {
  it('normalizes email and accepts candidate and recruiter roles', () => {
    expect(
      registerSchema.parse({
        email: '  USER@Example.COM ',
        password: 'strong-password',
        role: 'CANDIDATE',
      }),
    ).toEqual({
      email: 'user@example.com',
      password: 'strong-password',
      role: 'CANDIDATE',
    });
  });

  it('rejects admin self-registration and invalid credentials', () => {
    expect(
      registerSchema.safeParse({
        email: 'user@example.com',
        password: 'strong-password',
        role: 'ADMIN',
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        email: 'not-an-email',
        password: 'short',
        role: 'RECRUITER',
      }).success,
    ).toBe(false);
  });
});

describe('userDtoSchema', () => {
  it('strips private account fields from public DTOs', () => {
    const result = userDtoSchema.safeParse({
      id: 'user-id',
      email: 'user@example.com',
      fullName: null,
      role: 'CANDIDATE',
      emailVerified: false,
      passwordHash: 'secret',
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('passwordHash');
  });
});

describe('googleSignInResponseSchema', () => {
  it('accepts role-selection and confirmation-required responses', () => {
    expect(
      googleSignInResponseSchema.safeParse({
        requiresRoleSelection: true,
        roles: ['CANDIDATE', 'RECRUITER'],
      }).success,
    ).toBe(true);
    expect(
      googleSignInResponseSchema.safeParse({
        requiresEmailVerification: true,
        message: 'Check your email',
      }).success,
    ).toBe(true);
  });
});
