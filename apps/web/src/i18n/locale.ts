export const LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Vietnamese is the default for visitors without a saved choice. */
export const DEFAULT_LOCALE: Locale = 'vi';

/** Cookie that remembers the visitor's language choice. */
export const LOCALE_COOKIE = 'locale';

/** Anything other than a supported locale (or no cookie) means the default. */
export function parseLocale(value: string | null | undefined): Locale {
  return LOCALES.find((locale) => locale === value) ?? DEFAULT_LOCALE;
}
