import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, TIME_ZONE } from "./locales";
import { messagesByLocale } from "./messages";

/**
 * Per-request next-intl configuration referenced by next.config.ts. The app currently supports Vietnamese.
 * When adding languages, resolve the locale here from the user profile, cookie, Accept-Language header and default, in that order.
 */
export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return { locale, messages: messagesByLocale[locale], timeZone: TIME_ZONE };
});
