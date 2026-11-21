import { createTranslator, type Messages, type MessageKeys, type NestedKeyOf } from "next-intl";
import { DEFAULT_LOCALE, TIME_ZONE, type AppLocale } from "./locales";
import { messagesByLocale } from "./messages";

/**
 * Server-side translator for API errors, push notifications and reminders, using the api message namespace.
 * Independent of the request, so it also works in route handlers, cron jobs and background workers.
 */
export function getApiTranslator(locale: AppLocale = DEFAULT_LOCALE) {
  return createTranslator({ locale, messages: messagesByLocale[locale], namespace: "api", timeZone: TIME_ZONE });
}

export type ApiTranslator = ReturnType<typeof getApiTranslator>;

/** Key in the api namespace, such as budget.transaction.invalidAmount. */
export type ApiMessageKey = MessageKeys<Messages["api"], NestedKeyOf<Messages["api"]>>;
