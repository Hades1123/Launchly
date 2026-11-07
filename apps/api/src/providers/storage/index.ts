import { env } from '@/lib/env';
import type { StorageProvider } from './storage.interface';
import { LocalStorageProvider } from './local-storage.provider';

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    if (env.STORAGE_DRIVER === 'local') {
      storageInstance = new LocalStorageProvider();
    } else {
      // Future S3 provider implementation
      throw new Error(`Storage driver ${env.STORAGE_DRIVER} is not yet implemented`);
    }
  }
  return storageInstance;
}

export * from './storage.interface';
export * from './local-storage.provider';
