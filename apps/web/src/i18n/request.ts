import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import vi from '../../messages/vi.json';
import en from '../../messages/en.json';
import { LOCALE_COOKIE, parseLocale } from '@/i18n/locale';

type Messages = { [key: string]: string | Messages };

/** Fills keys missing from `target` with the fallback's text, so a raw key never shows. */
function withFallback(target: Messages, fallback: Messages): Messages {
  const merged: Messages = { ...fallback };
  for (const [key, value] of Object.entries(target)) {
    const base = fallback[key];
    merged[key] =
      typeof value === 'object' && typeof base === 'object' ? withFallback(value, base) : value;
  }
  return merged;
}

const catalogues = { vi, en: withFallback(en, vi) };

// No locale in the URL: the choice lives in a cookie written by the language switcher.
export default getRequestConfig(async () => {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return {
    locale,
    messages: catalogues[locale],
    timeZone: 'Asia/Ho_Chi_Minh',
  };
});
