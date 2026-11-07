import type { RequestHandler, Response } from 'express';
import {
  accessTokenResponseSchema,
  googleSignInResponseSchema,
  messageResponseSchema,
  sessionResponseSchema,
  userDtoSchema,
} from '@launchly/shared';
import { env } from '@/lib/env';
import { HttpError } from '@/lib/http-error';
import { currentAuth } from '@/middlewares/authenticate';
import type { createAuthService } from '@/modules/auth/auth.service';

type AuthService = ReturnType<typeof createAuthService>;
const REFRESH_COOKIE = 'launchly_refresh';
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
};

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function withoutRefreshToken<T extends { refreshToken: string }>(
  result: T,
): Omit<T, 'refreshToken'> {
  const { refreshToken, ...body } = result;
  void refreshToken;
  return body;
}

export function createAuthController(service: AuthService) {
  const controller = {
    register: (async (req, res) => {
      res.status(201).json(messageResponseSchema.parse(await service.register(req.body)));
    }) satisfies RequestHandler,

    verifyEmail: (async (req, res) => {
      res.json(messageResponseSchema.parse(await service.verifyEmail(req.body.token)));
    }) satisfies RequestHandler,

    resendVerification: (async (req, res) => {
      res
        .status(202)
        .json(messageResponseSchema.parse(await service.resendVerification(req.body.email)));
    }) satisfies RequestHandler,

    login: (async (req, res) => {
      const result = await service.login(req.body.email, req.body.password);
      setRefreshCookie(res, result.refreshToken);
      res.json(sessionResponseSchema.parse(withoutRefreshToken(result)));
    }) satisfies RequestHandler,

    refresh: (async (req, res) => {
      try {
        const result = await service.refresh(req.cookies?.[REFRESH_COOKIE]);
        setRefreshCookie(res, result.refreshToken);
        res.json(accessTokenResponseSchema.parse(withoutRefreshToken(result)));
      } catch (error) {
        res.clearCookie(REFRESH_COOKIE, cookieOptions);
        throw error;
      }
    }) satisfies RequestHandler,

    logout: (async (req, res) => {
      await service.logout(currentAuth(res.locals).sessionId);
      res.clearCookie(REFRESH_COOKIE, cookieOptions).status(204).end();
    }) satisfies RequestHandler,

    google: (async (req, res) => {
      const result = await service.googleSignIn(req.body.idToken, req.body.role);
      if ('session' in result && result.session) {
        setRefreshCookie(res, result.session.refreshToken);
        res.json(sessionResponseSchema.parse(withoutRefreshToken(result.session)));
        return;
      }
      res.json(googleSignInResponseSchema.parse(result));
    }) satisfies RequestHandler,

    completeGoogleLink: (async (req, res) => {
      const result = await service.completeGoogleLink(req.body.token);
      setRefreshCookie(res, result.refreshToken);
      res.json(sessionResponseSchema.parse(withoutRefreshToken(result)));
    }) satisfies RequestHandler,

    forgotPassword: (async (req, res) => {
      try {
        res
          .status(202)
          .json(messageResponseSchema.parse(await service.forgotPassword(req.body.email)));
      } catch (error) {
        if (!(error instanceof HttpError) || error.code !== 'EMAIL_DELIVERY_FAILED') {
          throw error;
        }
        console.error('Password reset email delivery failed');
        res
          .status(202)
          .json(
            messageResponseSchema.parse({
              message: 'If eligible, the request will be processed',
            }),
          );
      }
    }) satisfies RequestHandler,

    resetPassword: (async (req, res) => {
      await service.resetPassword(req.body.token, req.body.password);
      res.status(204).end();
    }) satisfies RequestHandler,

    me: ((req, res) => {
      res.json(userDtoSchema.parse(res.locals.currentUser));
    }) satisfies RequestHandler,
  };
  return controller;
}
