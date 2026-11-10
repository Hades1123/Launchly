import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import {
  AuthTokenPurpose,
  type PrismaClient,
  type UserRole,
} from '@/generated/prisma/client';
import { env } from '@/lib/env';
import { HttpError } from '@/lib/http-error';
import { nameFromEmail } from '@/lib/utils';
import {
  generateOpaqueToken,
  hashPassword,
  hashRefreshToken,
  hashToken,
  verifyPassword,
} from '@/modules/auth/auth.crypto';
import type { MailProvider } from '@/providers/mail/mail-provider';
import type {
  GoogleIdentityProvider,
} from '@/providers/google/google.provider';
import { createAuthEmail } from '@/providers/mail/auth-email-templates';
import type { UserDto } from '@launchly/shared';

const ACCESS_TOKEN_SECONDS = 15 * 60;
const REFRESH_TOKEN_SECONDS = 7 * 24 * 60 * 60;
const VERIFICATION_TOKEN_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_MS = 30 * 60 * 1000;
const dummyPasswordHash = hashPassword('launchly-invalid-login-placeholder');

type PublicUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  emailVerifiedAt: Date | null;
  lockedAt?: Date | null;
};

function toUserDto(user: PublicUser): UserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
  };
}

function safeEqualDomain(email: string, hostedDomain: string | null): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return Boolean(
    domain &&
      (domain === 'gmail.com' ||
        (hostedDomain && hostedDomain.toLowerCase() === domain)),
  );
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function createLink(path: string, token: string): string {
  const url = new URL(path, env.APP_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

export function createAuthService(
  prisma: PrismaClient,
  mail: MailProvider,
  google: GoogleIdentityProvider,
) {
  async function createSession(user: PublicUser) {
    if (user.lockedAt) {
      throw new HttpError(403, 'ACCOUNT_LOCKED', 'This account is locked');
    }
    if (!user.emailVerifiedAt) {
      throw new HttpError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before signing in');
    }
    const sessionId = randomUUID();
    const refreshToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_SECONDS * 1000);
    await prisma.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: hashRefreshToken(refreshToken, env.JWT_REFRESH_SECRET),
        expiresAt,
      },
    });
    const accessToken = jwt.sign(
      { sub: user.id, sid: sessionId, role: user.role },
      env.JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: ACCESS_TOKEN_SECONDS,
        issuer: 'launchly-api',
        audience: 'launchly-web',
      },
    );
    return { accessToken, refreshToken, tokenType: 'Bearer' as const, expiresIn: ACCESS_TOKEN_SECONDS, user: toUserDto(user) };
  }

  async function createAuthToken(
    userId: string,
    purpose: AuthTokenPurpose,
    expiresAt: Date,
    providerSubject?: string,
  ) {
    const token = generateOpaqueToken();
    const tokenHash = hashToken(token);
    await prisma.$transaction([
      prisma.authToken.updateMany({
        where: { userId, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      prisma.authToken.create({
        data: { userId, tokenHash, purpose, expiresAt, providerSubject },
      }),
    ]);
    return token;
  }

  async function sendVerification(user: PublicUser) {
    const token = await createAuthToken(
      user.id,
      AuthTokenPurpose.EMAIL_VERIFICATION,
      new Date(Date.now() + VERIFICATION_TOKEN_MS),
    );
    const link = createLink('/verify-email', token);
    try {
      await mail.send({
        to: user.email,
        ...createAuthEmail('verification', link),
      });
    } catch {
      await prisma.authToken.deleteMany({ where: { tokenHash: hashToken(token) } });
      throw new HttpError(
        503,
        'EMAIL_DELIVERY_FAILED',
        'Verification email could not be sent',
      );
    }
  }

  return {
    async register(input: { email: string; password: string; role: UserRole }) {
      const email = input.email.trim().toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new HttpError(409, 'EMAIL_ALREADY_REGISTERED', 'Email is already registered');

      const passwordHash = await hashPassword(input.password);
      let user: PublicUser;
      try {
        user = await prisma.user.create({
          data: { email, passwordHash, role: input.role, fullName: nameFromEmail(email) },
          select: { id: true, email: true, fullName: true, role: true, emailVerifiedAt: true },
        });
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002'
        ) {
          throw new HttpError(409, 'EMAIL_ALREADY_REGISTERED', 'Email is already registered');
        }
        throw error;
      }

      try {
        await sendVerification(user);
      } catch (error) {
        if (!(error instanceof HttpError) || error.code !== 'EMAIL_DELIVERY_FAILED') {
          throw error;
        }
        await prisma.user.delete({ where: { id: user.id } });
        throw error;
      }
      return { message: 'Check your email to verify your account' };
    },

    async verifyEmail(token: string) {
      const tokenHash = hashToken(token);
      const record = await prisma.authToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
      if (
        !record ||
        record.purpose !== AuthTokenPurpose.EMAIL_VERIFICATION ||
        record.consumedAt ||
        record.expiresAt <= new Date()
      ) {
        throw new HttpError(400, 'INVALID_OR_EXPIRED_TOKEN', 'Verification link is invalid or expired');
      }
      const now = new Date();
      await prisma.$transaction(async (tx) => {
        const consumed = await tx.authToken.updateMany({
          where: {
            id: record.id,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) {
          throw new HttpError(400, 'INVALID_OR_EXPIRED_TOKEN', 'Verification link is invalid or expired');
        }
        await tx.user.update({
          where: { id: record.userId },
          data: { emailVerifiedAt: now },
        });
      });
      return { message: 'Email verified' };
    },

    async resendVerification(emailInput: string) {
      const user = await prisma.user.findUnique({
        where: { email: emailInput.trim().toLowerCase() },
        select: { id: true, email: true, fullName: true, role: true, emailVerifiedAt: true },
      });
      if (user && !user.emailVerifiedAt) await sendVerification(user);
      return { message: 'If the account can be verified, a message will be sent' };
    },

    async login(emailInput: string, password: string) {
      const user = await prisma.user.findUnique({
        where: { email: emailInput.trim().toLowerCase() },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          passwordHash: true,
          emailVerifiedAt: true,
          lockedAt: true,
        },
      });
      const passwordHash = user?.passwordHash ?? (await dummyPasswordHash);
      if (!(await verifyPassword(password, passwordHash)) || !user?.passwordHash) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
      }
      if (user.lockedAt) throw new HttpError(403, 'ACCOUNT_LOCKED', 'This account is locked');
      if (!user.emailVerifiedAt) {
        throw new HttpError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before signing in');
      }
      return createSession(user);
    },

    async refresh(refreshToken: string | undefined) {
      if (!refreshToken) throw new HttpError(401, 'INVALID_SESSION', 'Session is invalid or expired');
      const tokenHash = hashRefreshToken(refreshToken, env.JWT_REFRESH_SECRET);
      const session = await prisma.authSession.findUnique({
        where: { refreshTokenHash: tokenHash },
        include: { user: true },
      });
      const now = new Date();
      if (!session || session.revokedAt || session.expiresAt <= now || session.user.lockedAt) {
        throw new HttpError(401, 'INVALID_SESSION', 'Session is invalid or expired');
      }
      const nextToken = generateOpaqueToken();
      const updated = await prisma.authSession.updateMany({
        where: {
          id: session.id,
          refreshTokenHash: tokenHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          refreshTokenHash: hashRefreshToken(nextToken, env.JWT_REFRESH_SECRET),
          expiresAt: new Date(now.getTime() + REFRESH_TOKEN_SECONDS * 1000),
        },
      });
      if (updated.count !== 1) throw new HttpError(401, 'INVALID_SESSION', 'Session is invalid or expired');
      const accessToken = jwt.sign(
        { sub: session.userId, sid: session.id, role: session.user.role },
        env.JWT_SECRET,
        {
          algorithm: 'HS256',
          expiresIn: ACCESS_TOKEN_SECONDS,
          issuer: 'launchly-api',
          audience: 'launchly-web',
        },
      );
      return { accessToken, refreshToken: nextToken, tokenType: 'Bearer' as const, expiresIn: ACCESS_TOKEN_SECONDS };
    },

    async logout(sessionId: string) {
      await prisma.authSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    },

    async getSessionUser(sessionId: string, userId: string) {
      const session = await prisma.authSession.findFirst({
        where: {
          id: sessionId,
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { lockedAt: null },
        },
        select: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              emailVerifiedAt: true,
            },
          },
        },
      });
      if (!session?.user || !session.user.emailVerifiedAt) {
        throw new HttpError(401, 'INVALID_SESSION', 'Session is invalid or expired');
      }
      return toUserDto(session.user);
    },

    async googleSignIn(idToken: string, role?: UserRole) {
      const identity = await google.verify(idToken);
      if (!identity.emailVerified) {
        throw new HttpError(401, 'INVALID_GOOGLE_IDENTITY', 'Google identity is invalid');
      }
      const existingByGoogle = await prisma.user.findUnique({
        where: { googleId: identity.subject },
        select: { id: true, email: true, fullName: true, role: true, emailVerifiedAt: true, lockedAt: true },
      });
      if (existingByGoogle) {
        if (existingByGoogle.lockedAt) throw new HttpError(403, 'ACCOUNT_LOCKED', 'This account is locked');
        if (!existingByGoogle.emailVerifiedAt) {
          throw new HttpError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before signing in');
        }
        return { session: await createSession(existingByGoogle) };
      }

      const matchingEmail = await prisma.user.findUnique({
        where: { email: identity.email },
        select: { id: true, email: true, fullName: true, role: true, emailVerifiedAt: true, lockedAt: true },
      });
      if (matchingEmail) {
        if (matchingEmail.lockedAt) throw new HttpError(403, 'ACCOUNT_LOCKED', 'This account is locked');
        if (safeEqualDomain(identity.email, identity.hostedDomain)) {
          const user = await prisma.user.update({
            where: { id: matchingEmail.id },
            data: {
              googleId: identity.subject,
              emailVerifiedAt: matchingEmail.emailVerifiedAt ?? new Date(),
            },
            select: { id: true, email: true, fullName: true, role: true, emailVerifiedAt: true },
          });
          return { session: await createSession(user) };
        }
        const token = await createAuthToken(
          matchingEmail.id,
          AuthTokenPurpose.GOOGLE_ACCOUNT_LINK,
          new Date(Date.now() + RESET_TOKEN_MS),
          identity.subject,
        );
        const link = createLink('/google-link', token);
        try {
          await mail.send({
            to: matchingEmail.email,
            ...createAuthEmail('google-link', link),
          });
        } catch {
          await prisma.authToken.deleteMany({
            where: { tokenHash: hashToken(token) },
          });
          throw new HttpError(
            503,
            'EMAIL_DELIVERY_FAILED',
            'Account link confirmation email could not be sent',
          );
        }
        return { requiresEmailVerification: true, message: 'Check your email to confirm linking' };
      }

      if (!role) {
        return { requiresRoleSelection: true, roles: ['CANDIDATE', 'RECRUITER'] as const };
      }
      let user: PublicUser;
      try {
        user = await prisma.user.create({
          data: {
            email: identity.email,
            googleId: identity.subject,
            fullName: identity.fullName ?? nameFromEmail(identity.email),
            role,
            emailVerifiedAt: new Date(),
          },
          select: { id: true, email: true, fullName: true, role: true, emailVerifiedAt: true },
        });
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          throw new HttpError(
            409,
            'ACCOUNT_ALREADY_REGISTERED',
            'An account already exists for this Google identity or email',
          );
        }
        throw error;
      }
      return { session: await createSession(user) };
    },

    async completeGoogleLink(token: string) {
      const record = await prisma.authToken.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: true },
      });
      if (
        !record ||
        record.purpose !== AuthTokenPurpose.GOOGLE_ACCOUNT_LINK ||
        !record.providerSubject ||
        record.consumedAt ||
        record.expiresAt <= new Date()
      ) {
        throw new HttpError(400, 'INVALID_OR_EXPIRED_TOKEN', 'Confirmation link is invalid or expired');
      }
      if (record.user.lockedAt) {
        throw new HttpError(403, 'ACCOUNT_LOCKED', 'This account is locked');
      }
      const now = new Date();
      let result: PublicUser;
      try {
        result = await prisma.$transaction(async (tx) => {
          const consumed = await tx.authToken.updateMany({
            where: { id: record.id, consumedAt: null, expiresAt: { gt: now } },
            data: { consumedAt: now },
          });
          if (consumed.count !== 1) {
            throw new HttpError(400, 'INVALID_OR_EXPIRED_TOKEN', 'Confirmation link is invalid or expired');
          }
          return tx.user.update({
            where: { id: record.userId },
            data: { googleId: record.providerSubject, emailVerifiedAt: now },
            select: { id: true, email: true, fullName: true, role: true, emailVerifiedAt: true },
          });
        });
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          throw new HttpError(
            409,
            'ACCOUNT_ALREADY_REGISTERED',
            'This Google identity is already linked to another account',
          );
        }
        throw error;
      }
      return createSession(result);
    },

    async forgotPassword(emailInput: string) {
      const user = await prisma.user.findUnique({
        where: { email: emailInput.trim().toLowerCase() },
        select: { id: true, email: true },
      });
      if (user) {
        const token = await createAuthToken(
          user.id,
          AuthTokenPurpose.PASSWORD_RESET,
          new Date(Date.now() + RESET_TOKEN_MS),
        );
        const link = createLink('/reset-password', token);
        try {
          await mail.send({
            to: user.email,
            ...createAuthEmail('password-reset', link),
          });
        } catch {
          await prisma.authToken.deleteMany({ where: { tokenHash: hashToken(token) } });
          throw new HttpError(
            503,
            'EMAIL_DELIVERY_FAILED',
            'Password reset request could not be processed',
          );
        }
      }
      return { message: 'If eligible, the request will be processed' };
    },

    async resetPassword(token: string, password: string) {
      const record = await prisma.authToken.findUnique({
        where: { tokenHash: hashToken(token) },
      });
      if (
        !record ||
        record.purpose !== AuthTokenPurpose.PASSWORD_RESET ||
        record.consumedAt ||
        record.expiresAt <= new Date()
      ) {
        throw new HttpError(400, 'INVALID_OR_EXPIRED_TOKEN', 'Reset link is invalid or expired');
      }
      const passwordHash = await hashPassword(password);
      const now = new Date();
      await prisma.$transaction(async (tx) => {
        const consumed = await tx.authToken.updateMany({
          where: { id: record.id, consumedAt: null, expiresAt: { gt: now } },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) {
          throw new HttpError(400, 'INVALID_OR_EXPIRED_TOKEN', 'Reset link is invalid or expired');
        }
        await tx.user.update({
          where: { id: record.userId },
          data: { passwordHash },
        });
        await tx.authSession.updateMany({
          where: { userId: record.userId, revokedAt: null },
          data: { revokedAt: now },
        });
      });
    },

    verifyAccessToken(token: string) {
      const payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'launchly-api',
        audience: 'launchly-web',
      });
      if (
        typeof payload === 'string' ||
        typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string'
      ) {
        throw new HttpError(401, 'INVALID_SESSION', 'Session is invalid or expired');
      }
      return { userId: payload.sub, sessionId: payload.sid };
    },
  };
}
