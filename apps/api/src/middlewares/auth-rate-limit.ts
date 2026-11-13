import { rateLimit } from 'express-rate-limit';
import { env } from '@/lib/env';

export function createLoginRateLimit() {
  return rateLimit({
    windowMs: 2 * 60 * 1000,
    limit: env.LOGIN_RATE_LIMIT,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Try again later.' },
    },
  });
}

export function createRecoveryRateLimit() {
  return rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many recovery requests. Try again later.',
      },
    },
  });
}
