import type vi from '../../messages/vi.json';
import type { Locale } from '@/i18n/locale';

// Type-checks message keys and locales in `useTranslations`, `getTranslations` and `useLocale`.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof vi;
  }
}
