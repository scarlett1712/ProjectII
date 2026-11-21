import type messages from "./messages/vi.json";
import type { AppLocale } from "./src/shared/i18n/locales";

// Declare the locales and message structure so next-intl checks keys and arguments at build time.
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
