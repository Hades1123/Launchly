import { OAuth2Client } from 'google-auth-library';
import { env } from '@/lib/env';
import { HttpError } from '@/lib/http-error';

export interface GoogleIdentity {
  subject: string;
  email: string;
  emailVerified: boolean;
  fullName: string | null;
  hostedDomain: string | null;
}

export interface GoogleIdentityProvider {
  verify(idToken: string): Promise<GoogleIdentity>;
}

export function createGoogleProvider(): GoogleIdentityProvider {
  return {
    async verify(idToken) {
      if (!env.GOOGLE_CLIENT_ID) {
        throw new HttpError(
          503,
          'GOOGLE_SIGN_IN_UNAVAILABLE',
          'Google sign-in is not configured',
        );
      }
      try {
        const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
          idToken,
          audience: env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email || payload.email_verified !== true) {
          throw new HttpError(401, 'INVALID_GOOGLE_IDENTITY', 'Google identity is invalid');
        }
        return {
          subject: payload.sub,
          email: payload.email.trim().toLowerCase(),
          emailVerified: true,
          fullName: payload.name ?? null,
          hostedDomain: payload.hd ?? null,
        };
      } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(401, 'INVALID_GOOGLE_IDENTITY', 'Google identity is invalid');
      }
    },
  };
}
