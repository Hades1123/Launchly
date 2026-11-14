import { z } from 'zod';
import { AppError } from '@/lib/app-error';
import type { AiProvider, GenerateJsonInput } from './ai.interface';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_TIMEOUT_MS = 30_000;
/** Total tries per call (the first plus retries) before a rate limit or outage is reported. */
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 500;
/** Longest single wait, so even a large `Retry-After` stays inside the 30 s AI timeout. */
const MAX_WAIT_MS = 8_000;
/** Statuses worth retrying: Gemini's rate limit (429) and its transient server errors. */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const TOO_MANY_REQUESTS =
  'Too many requests to the AI. Please reduce the number of requests and try again in a moment.';

export interface GeminiOptions {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  /** Injected in tests so no request leaves the process. */
  fetch?: typeof fetch;
  /** Injected in tests so retries do not really wait. */
  sleep?: (ms: number) => Promise<void>;
}

/** `Retry-After` in seconds if Gemini sent one, else exponential backoff with up to 25 % jitter. */
function retryDelayMs(response: Response, failures: number): number {
  const seconds = Number(response.headers?.get('retry-after'));
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, MAX_WAIT_MS);
  const backoff = BASE_BACKOFF_MS * 2 ** (failures - 1);
  return Math.min(backoff + Math.random() * backoff * 0.25, MAX_WAIT_MS);
}

/** A failed or aborted call (including a timeout while the body is read) as a 503. */
function unavailable(error: unknown): AppError {
  const timedOut = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
  return new AppError('AI_UNAVAILABLE', timedOut ? 'AI request timed out' : 'AI request failed');
}

type GeminiReply = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

/** Calls the Gemini `generateContent` REST API with `fetch`; the key is sent in a header, never logged. */
export class GeminiAiProvider implements AiProvider {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: GeminiOptions) {
    this.fetchImpl = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async generateJson<T>(input: GenerateJsonInput<T>): Promise<T> {
    // Gemini takes plain JSON Schema without the draft marker.
    let responseJsonSchema: Record<string, unknown>;
    try {
      responseJsonSchema = z.toJSONSchema(input.schema);
    } catch {
      throw new AppError(
        'INTERNAL_ERROR',
        'The expected AI reply cannot be described as JSON Schema',
      );
    }
    delete responseJsonSchema.$schema;

    const body = JSON.stringify({
      ...(input.system && { systemInstruction: { parts: [{ text: input.system }] } }),
      contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema },
    });

    let response: Response;
    for (let attempt = 1; ; attempt++) {
      try {
        response = await this.fetchImpl(`${ENDPOINT}/${this.options.model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.options.apiKey },
          body,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        throw unavailable(error);
      }
      if (response.ok) break;
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
        throw new AppError(
          'AI_UNAVAILABLE',
          response.status === 429
            ? TOO_MANY_REQUESTS
            : `AI request failed with status ${response.status}`,
        );
      }
      await this.sleep(retryDelayMs(response, attempt));
    }

    let reply: GeminiReply;
    try {
      reply = (await response.json()) as GeminiReply;
    } catch (error) {
      throw unavailable(error);
    }
    const text = reply.candidates?.[0]?.content?.parts?.[0]?.text;
    let value: unknown;
    try {
      value = JSON.parse(text ?? '');
    } catch {
      throw new AppError('AI_UNAVAILABLE', 'AI returned an invalid response');
    }
    const parsed = input.schema.safeParse(value);
    if (!parsed.success) throw new AppError('AI_UNAVAILABLE', 'AI returned an invalid response');
    return parsed.data;
  }
}
