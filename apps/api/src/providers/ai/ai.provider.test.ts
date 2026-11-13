/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppError } from '@/lib/app-error';
import { envSchema } from '@/lib/env';
import { createAiProvider } from '@/providers/ai';
import { GeminiAiProvider } from '@/providers/ai/gemini-ai.provider';
import { MockAiProvider } from '@/providers/ai/mock-ai.provider';

const schema = z.object({
  score: z.number().int().min(0).max(100),
  label: z.enum(['good', 'bad']),
  note: z.string().nullable(),
  tags: z.array(z.string()),
  items: z.array(z.object({ id: z.uuid(), done: z.boolean() })),
  extra: z.string().optional(),
});
const input = { prompt: 'Rate this CV', system: 'You are a recruiter', schema };
const valid = { score: 80, label: 'good', note: null, tags: ['a'], items: [] };

const base = {
  DATABASE_URL: 'postgresql://x',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

const geminiReply = (value: unknown) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] }),
});

describe('createAiProvider', () => {
  it('returns the driver chosen by AI_DRIVER', () => {
    expect(createAiProvider({ driver: 'mock', model: 'm' })).toBeInstanceOf(MockAiProvider);
    expect(createAiProvider({ driver: 'gemini', model: 'm', geminiApiKey: 'k' })).toBeInstanceOf(
      GeminiAiProvider,
    );
  });

  it('refuses the gemini driver without a key', () => {
    expect(() => createAiProvider({ driver: 'gemini', model: 'm' })).toThrow(/GEMINI_API_KEY/);
  });
});

describe('env', () => {
  it('defaults to the mock driver', () => {
    const parsed = envSchema.parse(base);
    expect(parsed.AI_DRIVER).toBe('mock');
    expect(parsed.AI_MODEL).toBeTruthy();
  });

  it('rejects AI_DRIVER=gemini without GEMINI_API_KEY and accepts it with one', () => {
    const missing = envSchema.safeParse({ ...base, AI_DRIVER: 'gemini' });
    expect(missing.success).toBe(false);
    expect(JSON.stringify(missing.error?.issues)).toContain('GEMINI_API_KEY');
    expect(envSchema.safeParse({ ...base, AI_DRIVER: 'gemini', GEMINI_API_KEY: 'k' }).success).toBe(
      true,
    );
    expect(envSchema.safeParse({ ...base, AI_DRIVER: 'openai' }).success).toBe(false);
  });
});

describe('MockAiProvider', () => {
  it('returns deterministic output that validates against the schema', async () => {
    const provider = new MockAiProvider();
    const first = await provider.generateJson(input);
    const second = await provider.generateJson(input);

    expect(schema.safeParse(first).success).toBe(true);
    expect(second).toEqual(first);
  });

  it('can be given a canned reply, which is still validated', async () => {
    const ok = new MockAiProvider({ respond: () => valid });
    expect(await ok.generateJson(input)).toEqual(valid);

    const bad = new MockAiProvider({ respond: () => ({ score: 'high' }) });
    await expect(bad.generateJson(input)).rejects.toBeInstanceOf(AppError);
  });
});

describe('GeminiAiProvider', () => {
  const make = (fetchImpl: any) =>
    new GeminiAiProvider({ apiKey: 'secret-key', model: 'gemini-test', fetch: fetchImpl });

  it('uses only the injected fetch and sends the prompt, model and JSON schema', async () => {
    const fetchImpl = vi.fn(async () => geminiReply(valid));
    const result = await make(fetchImpl).generateJson(input);

    expect(result).toEqual(valid);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, any];
    expect(url).toContain('models/gemini-test:generateContent');
    expect(init.headers['x-goog-api-key']).toBe('secret-key');
    const sent = JSON.parse(init.body);
    expect(sent.contents[0].parts[0].text).toBe('Rate this CV');
    expect(sent.systemInstruction.parts[0].text).toBe('You are a recruiter');
    expect(sent.generationConfig.responseMimeType).toBe('application/json');
    expect(sent.generationConfig.responseJsonSchema.type).toBe('object');
    expect(url).not.toContain('secret-key');
  });

  it('maps a non-200 reply and a network failure to AI_UNAVAILABLE without leaking the key', async () => {
    const http = make(vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    const failure = await http.generateJson(input).catch((e) => e);
    expect(failure).toBeInstanceOf(AppError);
    expect(failure.code).toBe('AI_UNAVAILABLE');
    expect(failure.message).not.toContain('secret-key');

    const network = make(vi.fn(async () => Promise.reject(new Error('socket hang up'))));
    expect((await network.generateJson(input).catch((e) => e)).code).toBe('AI_UNAVAILABLE');
  });

  it('applies the 30 s timeout through an AbortSignal', async () => {
    const spy = vi.spyOn(AbortSignal, 'timeout');
    const fetchImpl = vi.fn(async () => geminiReply(valid));
    await make(fetchImpl).generateJson(input);

    expect(spy).toHaveBeenCalledWith(30_000);
    const init = (fetchImpl.mock.calls[0] as unknown as [string, any])[1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
    spy.mockRestore();
  });

  it('aborts a request that never answers once the timeout passes', async () => {
    const hanging = vi.fn(
      (_url: string, init: any) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(init.signal.reason));
        }),
    );
    const provider = new GeminiAiProvider({
      apiKey: 'secret-key',
      model: 'm',
      timeoutMs: 20,
      fetch: hanging as any,
    });
    const error = await provider.generateJson(input).catch((e) => e);

    expect(error.code).toBe('AI_UNAVAILABLE');
    expect(error.message).toMatch(/timed out/i);
  });

  it('maps a 200 reply whose body is not JSON to AI_UNAVAILABLE', async () => {
    const broken = make(
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => Promise.reject(new SyntaxError('bad json')),
      })),
    );

    expect((await broken.generateJson(input).catch((e) => e)).code).toBe('AI_UNAVAILABLE');
  });

  it('maps a timeout to AI_UNAVAILABLE', async () => {
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    const provider = make(vi.fn(async () => Promise.reject(timeout)));
    const error = await provider.generateJson(input).catch((e) => e);

    expect(error.code).toBe('AI_UNAVAILABLE');
    expect(error.message).toMatch(/timed out/i);
  });

  it('turns invalid model output into an AppError', async () => {
    const notJson = make(
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }),
      })),
    );
    expect((await notJson.generateJson(input).catch((e) => e)).code).toBe('AI_UNAVAILABLE');

    const wrongShape = make(vi.fn(async () => geminiReply({ score: 'high' })));
    expect(await wrongShape.generateJson(input).catch((e) => e)).toBeInstanceOf(AppError);
  });
});
