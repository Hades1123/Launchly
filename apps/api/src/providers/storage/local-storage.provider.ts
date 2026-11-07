import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import type { StorageProvider } from './storage.interface';

export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'uploads');
  }

  private async ensureDir(): Promise<void> {
    await fs.promises.mkdir(this.baseDir, { recursive: true });
  }

  async save(fileBuffer: Buffer, originalFileName: string): Promise<string> {
    await this.ensureDir();
    const ext = path.extname(originalFileName) || '.pdf';
    const storageKey = `${randomUUID()}${ext}`;
    const destinationPath = path.join(this.baseDir, storageKey);

    await fs.promises.writeFile(destinationPath, fileBuffer);
    return storageKey;
  }

  async delete(storageKey: string): Promise<void> {
    const filePath = path.join(this.baseDir, path.basename(storageKey));
    try {
      await fs.promises.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async getStream(storageKey: string): Promise<Readable> {
    const filePath = path.join(this.baseDir, path.basename(storageKey));
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      throw new Error(`File not found: ${storageKey}`);
    }

    return fs.createReadStream(filePath);
  }
}
