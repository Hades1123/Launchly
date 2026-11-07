import type { ErrorCode } from '@launchly/shared';
import { AppError } from '@/lib/app-error';

export class HttpError extends AppError {
  constructor(
    status: number,
    code: ErrorCode,
    message: string,
  ) {
    super(code, message);
    if (status !== this.status) {
      throw new RangeError(`HTTP status ${status} does not match error code ${code}`);
    }
    this.name = 'HttpError';
  }
}
