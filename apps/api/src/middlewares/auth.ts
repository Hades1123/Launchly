import type { Request, Response, NextFunction } from 'express';
import { env } from '@/lib/env';
import { AppError } from '@/lib/app-error';

export interface AuthUser {
  id: string;
  email: string;
  role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN';
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Authentication middleware with pluggable mock support for development and testing.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  // Allow test / local development mock user via headers
  if (env.NODE_ENV !== 'production' && req.headers['x-mock-user-id']) {
    req.user = {
      id: String(req.headers['x-mock-user-id']),
      email: (req.headers['x-mock-user-email'] as string) || 'candidate@test.com',
      role: (req.headers['x-mock-user-role'] as 'CANDIDATE' | 'RECRUITER' | 'ADMIN') || 'CANDIDATE',
    };
    return next();
  }

  // When SCRUM-23 lands, JWT token verification from httpOnly cookie or Bearer header will go here
  next();
}

/**
 * Guard middleware ensuring request is from an authenticated Candidate.
 */
export function requireCandidateAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError('UNAUTHORIZED', 'Authentication required'));
  }

  if (req.user.role !== 'CANDIDATE') {
    return next(new AppError('FORBIDDEN', 'Candidate access required'));
  }

  next();
}
