import { Router } from 'express';
import {
  forgotPasswordSchema,
  googleSignInSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  tokenRequestSchema,
} from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import {
  createLoginRateLimit,
  createRecoveryRateLimit,
} from '@/middlewares/auth-rate-limit';
import { validateBody } from '@/middlewares/validate';
import { createAuthController } from '@/modules/auth/auth.controller';
import type { createAuthService } from '@/modules/auth/auth.service';

type AuthService = ReturnType<typeof createAuthService>;

export function createAuthRouter(service: AuthService) {
  const router = Router();
  const controller = createAuthController(service);
  const loginRateLimit = createLoginRateLimit();
  const recoveryRateLimit = createRecoveryRateLimit();

  router.post('/register', validateBody(registerSchema), controller.register);
  router.post('/verify-email', validateBody(tokenRequestSchema), controller.verifyEmail);
  router.post(
    '/resend-verification',
    recoveryRateLimit,
    validateBody(resendVerificationSchema),
    controller.resendVerification,
  );
  router.post('/login', loginRateLimit, validateBody(loginSchema), controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', authenticate(service), controller.logout);
  router.post(
    '/google',
    loginRateLimit,
    validateBody(googleSignInSchema),
    controller.google,
  );
  router.post(
    '/forgot-password',
    recoveryRateLimit,
    validateBody(forgotPasswordSchema),
    controller.forgotPassword,
  );
  router.post('/reset-password', validateBody(resetPasswordSchema), controller.resetPassword);
  router.post(
    '/google/complete-link',
    validateBody(tokenRequestSchema),
    controller.completeGoogleLink,
  );
  router.get('/me', authenticate(service), controller.me);

  return router;
}
