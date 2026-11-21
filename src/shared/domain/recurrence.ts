import { addDays, addWeeks, addMonths } from "date-fns";
import { addAppMonths } from "./time";

/** Occurrence ID format: <seriesId>_rec_<timestamp in milliseconds>. */
export const INSTANCE_SEPARATOR = "_rec_";
export const instanceId = (seriesId: string, start: Date) => `${seriesId}${INSTANCE_SEPARATOR}${start.getTime()}`;
/** Extract the original series ID from an occurrence ID, leaving plain IDs unchanged. */
export const seriesIdOf = (id: string) => id.split(INSTANCE_SEPARATOR)[0];

/** Default occurrence listing window and horizon for open-ended series. */
const DEFAULT_MONTHS_BACK = 3;
const DEFAULT_MONTHS_AHEAD = 6;
export const defaultOpenEndLimit = (now = new Date()) => addMonths(now, DEFAULT_MONTHS_AHEAD);
export const defaultSeriesWindow = (now = new Date()) => ({ start: addMonths(now, -DEFAULT_MONTHS_BACK), end: defaultOpenEndLimit(now) });

export type RecurrenceType = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | string | null | undefined;

export type GeneratedInstance<T> = T & {
  isRecurringInstance?: boolean;
  originalId?: string;
  completed?: boolean;
};

export interface RecurringEvent {
  id: string;
  startAt: Date | string;
  endAt: Date | string;
  recurrence?: RecurrenceType;
  recurrenceEnd?: Date | string | null;
  [key: string]: any;
}

export interface RecurringTask {
  id: string;
  dueAt?: Date | string | null;
  createdAt?: Date | string;
  recurrence?: RecurrenceType;
  recurrenceEnd?: Date | string | null;
  [key: string]: any;
}

/**
 * Calculates next recurrence date based on frequency
 */
export function getNextRecurrenceDate(date: Date, recurrence: RecurrenceType): Date {
  if (recurrence === "DAILY") return addDays(date, 1);
  if (recurrence === "WEEKLY") return addWeeks(date, 1);
  // Use Vietnam calendar months. UTC month arithmetic can shift local dates for events between midnight and 06:59.
  if (recurrence === "MONTHLY") return addAppMonths(date, 1);
  return date;
}

const FIXED_PERIOD_DAYS: Partial<Record<string, number>> = { DAILY: 1, WEEKLY: 7 };

/**
 * For daily and weekly series, jump directly to the last occurrence before windowStart to avoid stepping through
 * every occurrence since the start of a long-running series.
 * Adding k days at once gives the same result as applying addDays(d, 1) k times.
 * Step monthly series one month at a time to preserve occurrence dates. This takes only 12 steps per year.
 */
function fastForward(start: Date, windowStart: Date, recurrence: RecurrenceType): Date {
  const periodDays = recurrence ? FIXED_PERIOD_DAYS[recurrence] : undefined;
  if (!periodDays || start >= windowStart) return start;
  const periods = Math.floor((windowStart.getTime() - start.getTime()) / (periodDays * 24 * 60 * 60 * 1000));
  return periods > 1 ? addDays(start, (periods - 1) * periodDays) : start;
}

export interface SeriesWindow {
  start: Date;
  end: Date;
}

/** Minimum fields needed to expand a recurring series into occurrences. */
export interface RecurringItem {
  id: string;
  recurrence?: RecurrenceType;
  recurrenceEnd?: Date | string | null;
}

/**
 * Expand task or event occurrences that fall inside window.
 * getStart supplies the first occurrence. toInstance supplies the timestamp fields for each occurrence
 * (dueAt for tasks, startAt and endAt for events). Open-ended series expand only to
 * defaultOpenEndLimit. Return nonrecurring records unchanged.
 */
export function expandSeries<T extends RecurringItem>(
  item: T,
  getStart: (item: T) => Date,
  toInstance: (item: T, start: Date) => Partial<GeneratedInstance<T>>,
  window: SeriesWindow,
): GeneratedInstance<T>[] {
  const { recurrence } = item;
  if (!recurrence || recurrence === "NONE") {
    return [item as GeneratedInstance<T>];
  }

  const instances: GeneratedInstance<T>[] = [];
  let currentStart = fastForward(getStart(item), window.start, recurrence);
  const limitDate = item.recurrenceEnd ? new Date(item.recurrenceEnd) : defaultOpenEndLimit();

  while (currentStart <= limitDate && currentStart <= window.end) {
    if (currentStart >= window.start) {
      instances.push({
        ...item,
        id: instanceId(item.id, currentStart),
        isRecurringInstance: true,
        originalId: item.id,
        ...toInstance(item, new Date(currentStart)),
      });
    }

    currentStart = getNextRecurrenceDate(currentStart, recurrence);
    if (!["DAILY", "WEEKLY", "MONTHLY"].includes(recurrence)) {
      break;
    }
  }

  return instances;
}

/** Each event occurrence retains the duration of the original event. */
export function generateRecurringInstances<T extends RecurringEvent>(
  event: T,
  windowStart: Date,
  windowEnd: Date
): GeneratedInstance<T>[] {
  const durationMs = new Date(event.endAt).getTime() - new Date(event.startAt).getTime();
  return expandSeries(
    event,
    (e) => new Date(e.startAt),
    (_, start) => ({ startAt: start, endAt: new Date(start.getTime() + durationMs) }) as Partial<GeneratedInstance<T>>,
    { start: windowStart, end: windowEnd },
  );
}

/** Task occurrences start from the deadline or creation date and are initially incomplete. */
export function generateRecurringTaskInstances<T extends RecurringTask>(
  task: T,
  windowStart: Date,
  windowEnd: Date
): GeneratedInstance<T>[] {
  return expandSeries(
    task,
    (t) => new Date(t.dueAt || t.createdAt || Date.now()),
    (_, start) => ({ dueAt: start, completed: false }) as Partial<GeneratedInstance<T>>,
    { start: windowStart, end: windowEnd },
  );
}
