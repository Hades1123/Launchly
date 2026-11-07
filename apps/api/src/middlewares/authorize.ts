import type { RequestHandler } from 'express';
import type { UserRole } from '@/generated/prisma/client';
import { HttpError } from '@/lib/http-error';

export function authorize(...allowedRoles: UserRole[]): RequestHandler {
  return (_req, res, next) => {
    if (!res.locals.currentUser) {
      next(new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required'));
      return;
    }
    if (!allowedRoles.includes(res.locals.currentUser.role)) {
      next(new HttpError(403, 'FORBIDDEN', 'You do not have permission to access this resource'));
      return;
    }
    next();
  };
}
