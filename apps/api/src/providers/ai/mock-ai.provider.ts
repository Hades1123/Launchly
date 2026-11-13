import { z } from 'zod';
import { AppError } from '@/lib/app-error';
import type { AiProvider, GenerateJsonInput } from './ai.interface';

type JsonSchema = {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  format?: string;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  minimum?: number;
  minLength?: number;
  minItems?: number;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
};

const SAMPLE_UUID = '00000000-0000-4000-8000-000000000001';

/** The smallest valid, deterministic value for a JSON Schema (Zod's `toJSONSchema` output). */
function sample(schema: JsonSchema): unknown {
  if (schema.const !== undefined) return schema.const;
  if (schema.enum?.length) return schema.enum[0];
  const variants = schema.anyOf ?? schema.oneOf;
  if (variants?.length) return sample(variants.find((v) => v.type !== 'null') ?? variants[0]!);

  const type = Array.isArray(schema.type)
    ? (schema.type.find((t) => t !== 'null') ?? 'null')
    : schema.type;
  switch (type) {
    case 'string':
      if (schema.format === 'uuid') return SAMPLE_UUID;
      if (schema.format === 'email') return 'mock@example.com';
      return 'mock'.padEnd(schema.minLength ?? 0, 'x');
    case 'integer':
    case 'number':
      return schema.minimum ?? 0;
    case 'boolean':
      return false;
    case 'array':
      return schema.items
        ? Array.from({ length: schema.minItems ?? 0 }, () => sample(schema.items!))
        : [];
    case 'object':
      return Object.fromEntries(
        (schema.required ?? []).map((key) => [key, sample(schema.properties?.[key] ?? {})]),
      );
    default:
      return null;
  }
}

export interface MockAiOptions {
  /** Canned reply. It is still validated against the caller's schema. */
  respond?: (input: GenerateJsonInput<unknown>) => unknown;
}

/** Deterministic driver for tests and demos: no network, no key. */
export class MockAiProvider implements AiProvider {
  constructor(private readonly options: MockAiOptions = {}) {}

  async generateJson<T>(input: GenerateJsonInput<T>): Promise<T> {
    const raw = this.options.respond
      ? this.options.respond(input)
      : sample(z.toJSONSchema(input.schema) as JsonSchema);
    const parsed = input.schema.safeParse(raw);
    if (!parsed.success) throw new AppError('AI_UNAVAILABLE', 'AI returned an invalid response');
    return parsed.data;
  }
}
