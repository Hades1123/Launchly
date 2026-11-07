import { rateLimit } from 'express-rate-limit';

export function createLoginRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
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
