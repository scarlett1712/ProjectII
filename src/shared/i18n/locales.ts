/**
 * To support another language, add its code to LOCALES, create messages/<code>.json with the structure of
 * messages/vi.json and register it in messagesByLocale in messages.ts.
 */
export const LOCALES = ["vi"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "vi";

/** Default display time zone, defined in shared/domain/time. */
export { APP_TIME_ZONE as TIME_ZONE } from "@/shared/domain/time";
