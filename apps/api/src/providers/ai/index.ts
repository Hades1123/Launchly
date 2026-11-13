import { env } from '@/lib/env';
import type { AiProvider } from './ai.interface';
import { GeminiAiProvider } from './gemini-ai.provider';
import { MockAiProvider } from './mock-ai.provider';

export interface AiProviderConfig {
  driver: 'mock' | 'gemini';
  model: string;
  geminiApiKey?: string;
  fetch?: typeof fetch;
}

export function createAiProvider(config: AiProviderConfig): AiProvider {
  if (config.driver === 'mock') return new MockAiProvider();
  if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY is required when AI_DRIVER=gemini');
  return new GeminiAiProvider({
    apiKey: config.geminiApiKey,
    model: config.model,
    ...(config.fetch && { fetch: config.fetch }),
  });
}

let instance: AiProvider | null = null;

/** The provider selected by `AI_DRIVER` (mock by default). */
export function getAiProvider(): AiProvider {
  instance ??= createAiProvider({
    driver: env.AI_DRIVER,
    model: env.AI_MODEL,
    ...(env.GEMINI_API_KEY && { geminiApiKey: env.GEMINI_API_KEY }),
  });
  return instance;
}

export * from './ai.interface';
export * from './gemini-ai.provider';
export * from './mock-ai.provider';
export * from './with-timeout';
