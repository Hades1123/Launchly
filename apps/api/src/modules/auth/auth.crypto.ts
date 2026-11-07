import {
  createHmac,
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';

const SCRYPT_KEY_LENGTH = 64;

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await deriveKey(password, salt, SCRYPT_KEY_LENGTH, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [algorithm, n, r, p, saltValue, hashValue] = encoded.split('$');
  if (
    algorithm !== 'scrypt' ||
    n !== '16384' ||
    r !== '8' ||
    p !== '1' ||
    !saltValue ||
    !hashValue
  ) {
    return false;
  }

  const expected = Buffer.from(hashValue, 'base64url');
  const derived = await deriveKey(
    password,
    Buffer.from(saltValue, 'base64url'),
    expected.length,
    { N: 16384, r: 8, p: 1 },
  );
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashRefreshToken(token: string, secret: string): string {
  return createHmac('sha256', secret).update(token).digest('hex');
}
