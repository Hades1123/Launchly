import type { Locale } from '@/i18n/locale';
import type { Messages } from '@/i18n/messages';

// Type-checks message keys and locales in `useTranslations`, `getTranslations` and `useLocale`.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
