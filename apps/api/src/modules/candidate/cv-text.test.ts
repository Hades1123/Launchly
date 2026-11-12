/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/app-error';
import { validateCvFile } from '@/modules/candidate/cv-validator';
import { extractPdfText, getResumeText } from '@/modules/candidate/cv-text.service';

// Fixtures were printed to PDF from small HTML pages with headless Chrome:
// cv-en.pdf (English), cv-vi.pdf (Vietnamese, with diacritics), cv-scanned.pdf (one image, no text).
const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url));

describe('CV text extraction', () => {
  it('fixtures exist and are valid PDFs', () => {
    for (const name of ['cv-en.pdf', 'cv-vi.pdf', 'cv-scanned.pdf']) {
      expect(validateCvFile(fixture(name), name)).toEqual({ valid: true });
    }
  });

  it('English PDF returns its text', async () => {
    const text = await extractPdfText(fixture('cv-en.pdf'));

    expect(text).toContain('Alex Morgan');
    expect(text).toContain('Software Engineering Intern');
    expect(text).toContain('TypeScript, React, Node.js, PostgreSQL');
  });

  it('Vietnamese PDF keeps diacritics (NFC)', async () => {
    const text = await extractPdfText(fixture('cv-vi.pdf'));

    expect(text).toContain('Nguyễn Văn An');
    expect(text).toContain('Kỹ năng');
    expect(text).toBe(text.normalize('NFC'));
  });

  it('image-only PDF throws an AppError with the "text-based PDF" hint', async () => {
    const error = await extractPdfText(fixture('cv-scanned.pdf')).catch((e) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toMatch(/text-based PDF/);
  });

  it('a file that is not a readable PDF gets the same clear error', async () => {
    const error = await extractPdfText(Buffer.from('%PDF-1.4 not really a pdf')).catch((e) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toMatch(/text-based PDF/);
  });

  it('normalises whitespace', async () => {
    const text = await extractPdfText(fixture('cv-en.pdf'));

    expect(text).not.toMatch(/[ \t]{2,}/);
    expect(text).not.toMatch(/\n{3,}/);
    expect(text).toBe(text.trim());
  });

  it('loads a resume from the storage provider', async () => {
    const storage = {
      getStream: async () => Readable.from([fixture('cv-en.pdf')]),
    } as any;

    expect(await getResumeText({ storageKey: 'key-1' }, storage)).toContain('Alex Morgan');
  });
});
