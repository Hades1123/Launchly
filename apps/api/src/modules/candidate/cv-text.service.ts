import { extractText, getDocumentProxy } from 'unpdf';
import { AppError } from '@/lib/app-error';
import { getStorageProvider, type StorageProvider } from '@/providers/storage';

const unreadable = () =>
  new AppError(
    'VALIDATION_ERROR',
    'We could not read any text from this PDF. Export your CV as a text-based PDF and upload it again.',
  );

function normalise(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[ \t\f\v\u00a0]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Plain text of a text-based PDF (English or Vietnamese). An unreadable, empty or
 * scanned-image PDF raises an AppError that tells the candidate how to fix it.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  let text: string;
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
    ({ text } = await extractText(pdf, { mergePages: true }));
  } catch {
    throw unreadable();
  } finally {
    await pdf?.loadingTask.destroy();
  }
  const clean = normalise(text);
  if (!clean) throw unreadable();
  return clean;
}

async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/** Loads a stored resume and returns its text. */
export async function getResumeText(
  resume: { storageKey: string },
  storage: StorageProvider = getStorageProvider(),
): Promise<string> {
  return extractPdfText(await readAll(await storage.getStream(resume.storageKey)));
}
