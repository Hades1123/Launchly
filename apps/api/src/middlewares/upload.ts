import type { Request, Response, NextFunction } from 'express';
import { MAX_CV_FILE_SIZE } from '@/modules/candidate/cv-validator';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      file?: {
        buffer: Buffer;
        originalname: string;
        size: number;
        mimetype: string;
      };
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Lightweight, zero-dependency multipart/form-data parser for single CV file uploads.
 * Enforces server-side 5 MB file size limit while streaming.
 */
export function uploadCvMiddleware(req: Request, res: Response, next: NextFunction): void {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Content-Type must be multipart/form-data' },
    });
    return;
  }

  const match = contentType.match(/boundary=([^;]+)/i);
  if (!match || !match[1]) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid multipart boundary' },
    });
    return;
  }

  const boundary = match[1].trim().replace(/^"(.*)"$/, '$1');

  const chunks: Buffer[] = [];
  let totalLength = 0;
  let exceeded = false;

  req.on('data', (chunk: Buffer) => {
    if (exceeded) return;
    totalLength += chunk.length;
    if (totalLength > MAX_CV_FILE_SIZE + 4096) {
      exceeded = true;
      req.pause();
      res.status(413).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'File exceeds maximum allowed size of 5 MB' },
      });
    } else {
      chunks.push(chunk);
    }
  });

  req.on('end', () => {
    if (exceeded) return;

    const fullBuffer = Buffer.concat(chunks);
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const boundaryEndBuffer = Buffer.from(`--${boundary}--`);

    const boundaryIndex = fullBuffer.indexOf(boundaryBuffer);
    if (boundaryIndex === -1) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Missing multipart boundary in payload' },
      });
      return;
    }

    const headerStartIndex = boundaryIndex + boundaryBuffer.length + 2;
    const headerEndIndex = fullBuffer.indexOf(Buffer.from('\r\n\r\n'), headerStartIndex);

    if (headerEndIndex === -1) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Malformed multipart headers' },
      });
      return;
    }

    const headersString = fullBuffer.toString('utf-8', headerStartIndex, headerEndIndex);
    const filenameMatch = headersString.match(/filename="?([^";\r\n]+)"?/i);
    const contentTypeMatch = headersString.match(/Content-Type:\s*([^\r\n]+)/i);

    const originalname = filenameMatch?.[1] ? filenameMatch[1].trim() : 'cv.pdf';
    const mimetype = contentTypeMatch?.[1] ? contentTypeMatch[1].trim() : 'application/pdf';

    const fileContentStart = headerEndIndex + 4;
    let fileContentEnd = fullBuffer.indexOf(boundaryBuffer, fileContentStart);
    if (fileContentEnd === -1) {
      fileContentEnd = fullBuffer.indexOf(boundaryEndBuffer, fileContentStart);
    }

    if (fileContentEnd === -1) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Malformed multipart file payload' },
      });
      return;
    }

    let end = fileContentEnd;
    const prev1 = fullBuffer[end - 1];
    const prev2 = fullBuffer[end - 2];
    if (prev2 === 13 && prev1 === 10) {
      end -= 2;
    }

    const fileBuffer = fullBuffer.subarray(fileContentStart, end);

    if (fileBuffer.length > MAX_CV_FILE_SIZE) {
      res.status(413).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'File exceeds maximum allowed size of 5 MB' },
      });
      return;
    }

    req.file = {
      buffer: fileBuffer,
      originalname,
      size: fileBuffer.length,
      mimetype,
    };

    next();
  });

  req.on('error', (err) => {
    next(err);
  });
}
