import request from 'supertest';
import { apiErrorSchema, healthResponseSchema } from '@launchly/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from '@/app';
import { env } from '@/lib/env';

const json = (body: string) =>
  request(createApp()).post('/health').set('Content-Type', 'application/json').send(body);

describe('app', () => {
  it('GET /health returns 200 matching the shared schema', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(() => healthResponseSchema.parse(res.body)).not.toThrow();
  });

  it.each([
    ['unknown route 404', () => request(createApp()).get('/does-not-exist'), 404, 'NOT_FOUND'],
    ['malformed body 400', () => json('{bad'), 400, 'VALIDATION_ERROR'],
    [
      'oversized body 413',
      () => json(JSON.stringify({ big: 'a'.repeat(200 * 1024) })),
      413,
      'PAYLOAD_TOO_LARGE',
    ],
  ])('returns a JSON error for %s', async (_name, call, status, code) => {
    const res = await call();
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    expect(() => apiErrorSchema.parse(res.body)).not.toThrow();
  });
});

describe('createApp proxy trust', () => {
  it('trusts the configured number of proxy hops', () => {
    const original = env.TRUST_PROXY_HOPS;
    (env as { TRUST_PROXY_HOPS: number }).TRUST_PROXY_HOPS = 2;
    try {
      expect(createApp().get('trust proxy')).toBe(2);
    } finally {
      (env as { TRUST_PROXY_HOPS: number }).TRUST_PROXY_HOPS = original;
    }
  });
});
