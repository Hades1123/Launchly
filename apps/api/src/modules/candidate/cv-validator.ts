export const MAX_CV_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates CV file buffer size and authentic PDF magic bytes (%PDF-).
 */
export function validateCvFile(buffer: Buffer, originalFileName?: string): ValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (buffer.length > MAX_CV_FILE_SIZE) {
    return { valid: false, error: 'File exceeds maximum allowed size of 5 MB' };
  }

  // Check magic bytes %PDF- (hex: 25 50 44 46 2d)
  if (buffer.length < 5 || buffer.toString('utf-8', 0, 5) !== '%PDF-') {
    return { valid: false, error: 'File is not a valid PDF document (invalid magic bytes)' };
  }

  if (originalFileName && !originalFileName.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'File extension must be .pdf' };
  }

  return { valid: true };
}
