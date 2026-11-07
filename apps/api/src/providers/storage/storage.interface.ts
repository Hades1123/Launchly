import type { Readable } from 'stream';

export interface StorageProvider {
  /**
   * Saves a file buffer under a generated secure storage key and returns the key.
   */
  save(fileBuffer: Buffer, originalFileName: string): Promise<string>;

  /**
   * Deletes a file by its storage key. Does not throw if file is already deleted.
   */
  delete(storageKey: string): Promise<void>;

  /**
   * Retrieves a readable stream for the file by its storage key.
   * Throws an error if the file does not exist.
   */
  getStream(storageKey: string): Promise<Readable>;
}
