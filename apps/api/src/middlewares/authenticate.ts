import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '@/lib/http-error';
import type { createAuthService } from '@/modules/auth/auth.service';

type AuthService = ReturnType<typeof createAuthService>;

export function authenticate(service: AuthService): RequestHandler {
  return async (req, res, next) => {
    const header = req.header('authorization');
    const match = header?.match(/^Bearer ([^\s]+)$/);
    if (!match) {
      next(new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required'));
      return;
    }
    let auth: ReturnType<AuthService['verifyAccessToken']>;
    try {
      auth = service.verifyAccessToken(match[1]!);
    } catch (error) {
      if (error instanceof HttpError) {
        next(error);
        return;
      }
      if (error instanceof jwt.JsonWebTokenError) {
        next(new HttpError(401, 'INVALID_SESSION', 'Session is invalid or expired'));
        return;
      }
      next(error);
      return;
    }
    res.locals.auth = auth;
    res.locals.currentUser = await service.getSessionUser(auth.sessionId, auth.userId);
    next();
  };
}

export function currentAuth(locals: { auth?: { userId: string; sessionId: string } }) {
  if (!locals.auth) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in is required');
  }
  return locals.auth;
}
