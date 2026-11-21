/**
 * Application time zone: Vietnam, UTC+7 year-round.
 * The server runs in UTC on Vercel. Use these functions for server-side day and month calculations
 * instead of host-local operations such as new Date(year, month), setHours(0) and addMonths.
 */

export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";
/** UTC offset in ISO 8601 format. */
export const APP_UTC_OFFSET = "+07:00";
export const APP_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface DateRange {
  start: Date;
  /** Exclusive end of the interval. */
  end: Date;
}

/** Represent Vietnam wall-clock time in a Date's UTC fields for internal calculations. */
const toWallClock = (date: Date) => new Date(date.getTime() + APP_UTC_OFFSET_MS);
const fromWallClock = (wall: Date) => new Date(wall.getTime() - APP_UTC_OFFSET_MS);

/** Midnight in Vietnam on the date containing the given instant. */
export function startOfAppDay(date: Date): Date {
  const wall = toWallClock(date);
  wall.setUTCHours(0, 0, 0, 0);
  return fromWallClock(wall);
}

/** Vietnam-time half-open interval from midnight on day one of month (1–12) to midnight on day one of the next month. */
export function appMonthRange(year: number, month: number): DateRange {
  return {
    start: fromWallClock(new Date(Date.UTC(year, month - 1, 1))),
    end: fromWallClock(new Date(Date.UTC(year, month, 1))),
  };
}

/** Full calendar year in Vietnam time. */
export function appYearRange(year: number): DateRange {
  return {
    start: fromWallClock(new Date(Date.UTC(year, 0, 1))),
    end: fromWallClock(new Date(Date.UTC(year + 1, 0, 1))),
  };
}

/** Local year and month (1–12) in Vietnam at the given instant. */
export function appYearMonth(date: Date): { year: number; month: number } {
  const wall = toWallClock(date);
  return { year: wall.getUTCFullYear(), month: wall.getUTCMonth() + 1 };
}

/**
 * Add calendar months in Vietnam, preserving wall-clock time. Clamp dates beyond the target month's length
 * to its final day, matching date-fns addMonths.
 */
export function addAppMonths(date: Date, months: number): Date {
  const wall = toWallClock(date);
  const day = wall.getUTCDate();
  wall.setUTCDate(1);
  wall.setUTCMonth(wall.getUTCMonth() + months);
  const daysInTarget = new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth() + 1, 0)).getUTCDate();
  wall.setUTCDate(Math.min(day, daysInTarget));
  return fromWallClock(wall);
}

/** Local date containing the given instant in Vietnam, formatted as yyyy-MM-dd. */
export function appDayKey(date: Date): string {
  return toWallClock(date).toISOString().slice(0, 10);
}

/**
 * Attach Vietnam's offset to a date-time without a zone, such as 2026-11-15T08:00:00 from the LLM, so the server
 * interprets it as local time. Preserve non-string values and strings that already have a Z or numeric offset.
 */
export function withAppOffset(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) return value;
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) return value;
  return `${trimmed}${APP_UTC_OFFSET}`;
}

// ---------- Browser local time for date and datetime-local inputs ----------

const pad = (n: number) => String(n).padStart(2, "0");

/** Local yyyy-MM-dd value for date inputs and daily grouping keys. */
export function toDateInputValue(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local yyyy-MM-ddTHH:mm value for datetime-local inputs. */
export function toDateTimeLocalValue(date: Date | string): string {
  const d = new Date(date);
  return `${toDateInputValue(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Like toDateTimeLocalValue, returning an empty string when the value is absent. */
export function toOptionalDateTimeLocalValue(date: Date | string | null | undefined): string {
  return date ? toDateTimeLocalValue(date) : "";
}

/**
 * Convert a yyyy-MM-dd input to an instant, retaining the hours and minutes from keepTimeFrom (default midnight).
 * Use this when changing a transaction's date while preserving its saved time.
 */
export function fromDateInputValue(value: string, keepTimeFrom?: Date | string): Date {
  const [year, month, day] = value.split("-").map(Number);
  const time = keepTimeFrom ? new Date(keepTimeFrom) : null;
  return new Date(year, month - 1, day, time?.getHours() ?? 0, time?.getMinutes() ?? 0, time?.getSeconds() ?? 0);
}
