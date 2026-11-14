import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { LOCALE_COOKIE, parseLocale } from '@/i18n/locale';
import { catalogues } from '@/i18n/messages';

// No locale in the URL: the choice lives in a cookie written by the language switcher.
export default getRequestConfig(async () => {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return {
    locale,
    messages: catalogues[locale],
    timeZone: 'Asia/Ho_Chi_Minh',
  };
});
