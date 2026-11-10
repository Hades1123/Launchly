/** Small shared helpers. Keep unrelated one-liners here instead of one file each. */

/** Default display name when an account has none: the part of the email before "@". */
export function nameFromEmail(email: string): string {
  return email.split('@')[0] || email;
}
