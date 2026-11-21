import { format as formatWithPattern } from "date-fns";
import { vi } from "date-fns/locale";
export { APP_TIME_ZONE } from "@/shared/domain/time";

/** Application display locale. */
export const APP_LOCALE = "vi-VN";

const currencyFormatter = new Intl.NumberFormat(APP_LOCALE, { style: "currency", currency: "VND" });

/** Standard browser currency format, for example 1.000 ₫. */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** Like formatCurrency, using the letter đ in place of the currency symbol ₫. */
export function formatVND(amount: number): string {
  return formatCurrency(amount).replace("₫", "đ");
}

/** Vietnamese thousands separator, for example 1.000. */
export function formatNumber(value: number): string {
  return value.toLocaleString(APP_LOCALE);
}

/** Short date and time, for example 18/11/26 14:30. */
export function formatDateTimeShort(date: Date | string): string {
  return new Date(date).toLocaleString(APP_LOCALE, { dateStyle: "short", timeStyle: "short" });
}

/** Hours and minutes, for example 14:30. */
export function formatTime(date: Date | string, options: { timeZone?: string } = {}): string {
  return new Date(date).toLocaleTimeString(APP_LOCALE, { hour: "2-digit", minute: "2-digit", ...options });
}

/** Day, month and year, for example 18/11/2026. */
export function formatFullDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(APP_LOCALE);
}

/** Day and month, for example 18/11. */
export function formatDayMonth(date: Date | string): string {
  return new Date(date).toLocaleDateString(APP_LOCALE, { day: "2-digit", month: "2-digit" });
}

/** Format with a date-fns pattern in the Vietnamese locale. For example, EEEE gives the full weekday name. */
export function formatDate(date: Date | number, pattern: string): string {
  return formatWithPattern(date, pattern, { locale: vi });
}
