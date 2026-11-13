import { rateLimit } from 'express-rate-limit';
import { currentAuth } from '@/middlewares/authenticate';

export const INTERVIEW_AI_LIMIT = 10;
export const INTERVIEW_AI_WINDOW_MS = 60 * 1000;

/**
 * One shared quota per signed-in candidate across every interview AI route (question and
 * feedback generation): 10 requests per 60 s. Create it once and apply it to each route, so
 * the routes draw from the same counter. The counter lives in this process's memory, so with
 * several API instances each one has its own quota; a shared store is needed before that.
 */
export function createInterviewAiRateLimit() {
  return rateLimit({
    windowMs: INTERVIEW_AI_WINDOW_MS,
    limit: INTERVIEW_AI_LIMIT,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (_req, res) => currentAuth(res.locals).userId,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many practice requests. Wait a minute and try again.',
      },
    },
  });
}
