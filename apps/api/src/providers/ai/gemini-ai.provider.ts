import { z } from 'zod';
import { AppError } from '@/lib/app-error';
import type { AiProvider, GenerateJsonInput } from './ai.interface';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_TIMEOUT_MS = 30_000;

export interface GeminiOptions {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  /** Injected in tests so no request leaves the process. */
  fetch?: typeof fetch;
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

  constructor(private readonly options: GeminiOptions) {
    this.fetchImpl = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
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

    let response: Response;
    try {
      response = await this.fetchImpl(`${ENDPOINT}/${this.options.model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.options.apiKey },
        body: JSON.stringify({
          ...(input.system && { systemInstruction: { parts: [{ text: input.system }] } }),
          contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
          generationConfig: { responseMimeType: 'application/json', responseJsonSchema },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw unavailable(error);
    }
    if (!response.ok) {
      throw new AppError('AI_UNAVAILABLE', `AI request failed with status ${response.status}`);
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
