import request from 'supertest';
import { apiErrorSchema, healthResponseSchema } from '@launchly/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from '@/app';

describe('app', () => {
  it('GET /health returns 200 and matches the shared schema', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(() => healthResponseSchema.parse(res.body)).not.toThrow();
  });

  it('unknown routes return a JSON 404 NOT_FOUND', async () => {
    const res = await request(createApp()).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(() => apiErrorSchema.parse(res.body)).not.toThrow();
  });

  it('malformed JSON body returns 400 VALIDATION_ERROR', async () => {
    const res = await request(createApp())
      .post('/health')
      .set('Content-Type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(() => apiErrorSchema.parse(res.body)).not.toThrow();
  });

  it('an oversized JSON body returns 413 PAYLOAD_TOO_LARGE', async () => {
    const big = 'a'.repeat(200 * 1024);
    const res = await request(createApp())
      .post('/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ big }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(() => apiErrorSchema.parse(res.body)).not.toThrow();
  });
});
