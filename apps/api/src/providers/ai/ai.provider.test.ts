/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppError } from '@/lib/app-error';
import { envSchema } from '@/lib/env';
import { AI_TIMEOUT_MS, createAiProvider, getAiProvider, withTimeout } from '@/providers/ai';
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
  const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
  const make = (fetchImpl: any) =>
    new GeminiAiProvider({ apiKey: 'secret-key', model: 'gemini-test', fetch: fetchImpl, sleep });
  const failing = (status: number, headers: Record<string, string> = {}) => ({
    ok: false,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => ({}),
  });

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

  it('retries a 429 and succeeds once Gemini recovers', async () => {
    sleep.mockClear();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(failing(429))
      .mockResolvedValueOnce(failing(503))
      .mockResolvedValueOnce(geminiReply(valid));

    expect(await make(fetchImpl).generateJson(input)).toEqual(valid);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('gives up after 5 failed 429 requests with a "too many requests" message', async () => {
    const fetchImpl = vi.fn(async () => failing(429));

    const error = await make(fetchImpl)
      .generateJson(input)
      .catch((e) => e);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('AI_UNAVAILABLE');
    expect(error.message).toBe(
      'Too many requests to the AI. Please reduce the number of requests and try again in a moment.',
    );
  });

  it('retries a 503 five times and then reports the status', async () => {
    const fetchImpl = vi.fn(async () => failing(503));

    const error = await make(fetchImpl)
      .generateJson(input)
      .catch((e) => e);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(error.message).toBe('AI request failed with status 503');
  });

  it('does not retry a client error such as 400', async () => {
    const fetchImpl = vi.fn(async () => failing(400));

    const error = await make(fetchImpl)
      .generateJson(input)
      .catch((e) => e);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(error.message).toBe('AI request failed with status 400');
  });

  it('waits for Retry-After (capped) and otherwise backs off exponentially', async () => {
    sleep.mockClear();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(failing(429, { 'retry-after': '2' }))
      .mockResolvedValueOnce(failing(429, { 'retry-after': '600' }))
      .mockResolvedValueOnce(failing(429))
      .mockResolvedValueOnce(geminiReply(valid));

    await make(fetchImpl).generateJson(input);
    const waits = sleep.mock.calls.map(([ms]) => ms);
    expect(waits[0]).toBe(2000);
    expect(waits[1]).toBe(8000);
    // Third failure: 500 ms * 2^2 plus up to 25 % jitter.
    expect(waits[2]).toBeGreaterThanOrEqual(2000);
    expect(waits[2]).toBeLessThanOrEqual(2500);
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

describe('MockAiProvider default reply', () => {
  it('fills arrays up to minItems so a schema that needs several items still validates', async () => {
    const out = await new MockAiProvider().generateJson({
      prompt: 'x',
      schema: z.object({ suggestions: z.array(z.string().min(1)).min(3) }),
    });
    expect(out.suggestions).toHaveLength(3);
  });
});

describe('withTimeout', () => {
  it('resolves with the work result and rejects with AI_UNAVAILABLE after the limit', async () => {
    expect(AI_TIMEOUT_MS).toBe(30_000);
    await expect(withTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok');

    vi.useFakeTimers();
    try {
      const slow = withTimeout(new Promise<string>(() => {}), 1000);
      const assertion = expect(slow).rejects.toMatchObject({
        code: 'AI_UNAVAILABLE',
        message: 'The AI timed out after 1 s',
      });
      await vi.advanceTimersByTimeAsync(1000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('getAiProvider', () => {
  it('returns one shared provider for the configured driver', () => {
    const first = getAiProvider();

    expect(first).toBeInstanceOf(MockAiProvider);
    expect(getAiProvider()).toBe(first);
  });

  it('needs a key for the gemini driver and forwards a custom fetch', () => {
    expect(() => createAiProvider({ driver: 'gemini', model: 'm' })).toThrow(/GEMINI_API_KEY/);
    const provider = createAiProvider({
      driver: 'gemini',
      model: 'm',
      geminiApiKey: 'k',
      fetch: vi.fn() as unknown as typeof fetch,
    });
    expect(provider).toBeInstanceOf(GeminiAiProvider);
  });
});
