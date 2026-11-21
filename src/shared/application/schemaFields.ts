import { z } from "zod";
import { messageKey } from "./errors";

/** Shared error code for timestamps that cannot be parsed. */
export const INVALID_DATE_MESSAGE = messageKey("common.invalidDate");

/** Optional string. Undefined preserves the current value, null clears it, and other non-string values produce the supplied message code. */
export const nullableText = (message: string) => z.string({ error: message }).nullish();

/** Preserve undefined to leave the field unchanged. Coerce every other value with Boolean(v), matching the previous route. */
export const optionalFlag = z
  .unknown()
  .transform((v) => (v === undefined ? undefined : Boolean(v)))
  .optional();

/** Optional date. Undefined leaves it unchanged, while falsy values such as an empty string or null clear it. */
export const clearableDate = z.preprocess(
  (v) => (v === undefined ? undefined : v || null),
  z.coerce.date({ error: INVALID_DATE_MESSAGE }).nullable().optional(),
);

/** Valid recurrence types. NONE, an empty string and null represent a nonrecurring item. */
export const RECURRENCE_VALUES = ["NONE", "DAILY", "WEEKLY", "MONTHLY"] as const;
export type RecurrenceValue = (typeof RECURRENCE_VALUES)[number];

/** Optional recurrence. Undefined preserves it, an empty string or null clears it, and unknown values are rejected. */
export const recurrenceField = (message: string) =>
  z.preprocess((v) => (v === "" ? null : v), z.enum(RECURRENCE_VALUES, { error: message }).nullish());

/**
 * Recurring-series edit or delete scope: "one" for this occurrence, "future" from here onward, or "all" for the entire series.
 * Omit the mode to let the server choose. Reject unknown values to prevent typos from affecting the whole series.
 */
export const seriesModeSchema = z.preprocess(
  (v) => (v === null || v === "" ? undefined : v),
  z.enum(["one", "future", "all"], { error: messageKey("common.invalidSeriesMode") }).optional(),
);

/** Maximum start-to-end query range in days, sufficient for a seven-month calendar display. */
export const MAX_QUERY_RANGE_DAYS = 400;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calendar and task list queries require valid start and end dates with end on or after start.
 * Limit the interval to MAX_QUERY_RANGE_DAYS to bound recurrence expansion.
 */
export const dateRangeQuerySchema = z
  .object({
    start: z.preprocess((v) => v || undefined, z.coerce.date({ error: INVALID_DATE_MESSAGE }).optional()),
    end: z.preprocess((v) => v || undefined, z.coerce.date({ error: INVALID_DATE_MESSAGE }).optional()),
  })
  .refine(
    ({ start, end }) => !start || !end || (end >= start && end.getTime() - start.getTime() <= MAX_QUERY_RANGE_DAYS * DAY_MS),
    { message: messageKey("common.invalidDateRange") },
  );

/** Optional date. Treat falsy values as omitted (undefined). */
export const optionalDate = z.preprocess(
  (v) => v || undefined,
  z.coerce.date({ error: INVALID_DATE_MESSAGE }).optional(),
);
