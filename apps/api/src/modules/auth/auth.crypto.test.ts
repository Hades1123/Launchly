import { describe, expect, it } from 'vitest';
import {
  generateOpaqueToken,
  hashPassword,
  hashRefreshToken,
  hashToken,
  verifyPassword,
} from './auth.crypto';

describe('authentication cryptography', () => {
  it('stores password hashes that verify only the original password', async () => {
    const encoded = await hashPassword('correct horse battery staple');

    expect(encoded).not.toContain('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', encoded)).toBe(true);
    expect(await verifyPassword('wrong password', encoded)).toBe(false);
    expect(await verifyPassword('password', 'invalid')).toBe(false);
  });

  it('generates opaque tokens and stores only deterministic hashes', () => {
    const first = generateOpaqueToken();
    const second = generateOpaqueToken();

    expect(first).not.toBe(second);
    expect(first).toHaveLength(43);
    expect(hashToken(first)).toBe(hashToken(first));
    expect(hashToken(first)).not.toBe(first);
    expect(hashRefreshToken(first, 'secret')).not.toBe(
      hashRefreshToken(first, 'other-secret'),
    );
  });
});
