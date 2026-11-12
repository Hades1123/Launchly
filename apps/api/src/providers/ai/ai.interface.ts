import type { z } from 'zod';

export interface GenerateJsonInput<T> {
  prompt: string;
  /** Optional system instruction. */
  system?: string;
  /** The reply must satisfy this schema; anything else becomes an AppError. */
  schema: z.ZodType<T>;
}

/**
 * Business code depends on this interface, never on a vendor. The driver is chosen
 * by `AI_DRIVER` (`mock` for tests and demos, `gemini` for the real model).
 */
export interface AiProvider {
  generateJson<T>(input: GenerateJsonInput<T>): Promise<T>;
}
