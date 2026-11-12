/**
 * Live smoke test for the Gemini driver. NOT part of `pnpm test` (it needs a real key and
 * network, and may use free-tier quota). Run it by hand:
 *
 *   GEMINI_API_KEY=... pnpm --filter @launchly/api ai:smoke
 *
 * `GEMINI_API_KEY` and `AI_MODEL` are also read from `apps/api/.env`. It checks that the
 * model name exists, that the JSON-schema reply is accepted, and that a bad key or model
 * maps to AI_UNAVAILABLE. The key is never printed.
 */
import { z } from 'zod';
import { AppError } from '@/lib/app-error';
import { GeminiAiProvider } from '@/providers/ai/gemini-ai.provider';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.AI_MODEL || 'gemini-3.5-flash';
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set (export it or put it in apps/api/.env).');
  process.exit(2);
}

const schema = z.object({
  skills: z.array(z.string()).min(1),
  seniority: z.enum(['FRESHER', 'JUNIOR', 'SENIOR']),
});

const describeError = (error: unknown) =>
  error instanceof AppError ? `${error.code}: ${error.message}` : String(error);

async function check(name: string, run: () => Promise<void>): Promise<boolean> {
  try {
    await run();
    console.log(`PASS  ${name}`);
    return true;
  } catch (error) {
    console.log(`FAIL  ${name} -> ${describeError(error)}`);
    return false;
  }
}

console.log(`model: ${model}`);
const results = [
  await check('valid key and model return schema-valid JSON', async () => {
    const provider = new GeminiAiProvider({ apiKey, model });
    const out = await provider.generateJson({
      system: 'You extract hiring facts from a CV. Reply only with JSON.',
      prompt: 'CV: 2024 graduate, built a REST API in TypeScript and Express, knows SQL and Git.',
      schema,
    });
    console.log(`      reply: ${JSON.stringify(out)}`);
  }),
  await check('unknown model maps to AI_UNAVAILABLE', async () => {
    const provider = new GeminiAiProvider({ apiKey, model: 'no-such-model-xyz' });
    try {
      await provider.generateJson({ prompt: 'hi', schema });
    } catch (error) {
      if (error instanceof AppError && error.code === 'AI_UNAVAILABLE') return;
      throw error;
    }
    throw new Error('expected AI_UNAVAILABLE, call succeeded');
  }),
  await check('bad key maps to AI_UNAVAILABLE', async () => {
    const provider = new GeminiAiProvider({ apiKey: 'invalid-key', model });
    try {
      await provider.generateJson({ prompt: 'hi', schema });
    } catch (error) {
      if (error instanceof AppError && error.code === 'AI_UNAVAILABLE') return;
      throw error;
    }
    throw new Error('expected AI_UNAVAILABLE, call succeeded');
  }),
];
process.exit(results.every(Boolean) ? 0 : 1);
