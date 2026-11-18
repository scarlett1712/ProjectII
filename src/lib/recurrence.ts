import { addDays, addWeeks, addMonths } from "date-fns";

export type RecurrenceType = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | string | null | undefined;

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
  if (recurrence === "MONTHLY") return addMonths(date, 1);
  return date;
}

/**
 * Generates recurring instances for calendar events within a time window
 */
export function generateRecurringInstances<T extends RecurringEvent>(
  event: T,
  windowStart: Date,
  windowEnd: Date
): T[] {
  if (!event.recurrence || event.recurrence === "NONE") {
    return [event];
  }

  const instances: T[] = [];
  let currentStart = new Date(event.startAt);
  const originalEnd = new Date(event.endAt);
  const durationMs = originalEnd.getTime() - currentStart.getTime();
  const limitDate = event.recurrenceEnd ? new Date(event.recurrenceEnd) : addMonths(new Date(), 6);

  while (currentStart <= limitDate && currentStart <= windowEnd) {
    if (currentStart >= windowStart) {
      instances.push({
        ...event,
        id: `${event.id}_rec_${currentStart.getTime()}`,
        isRecurringInstance: true,
        originalId: event.id,
        startAt: new Date(currentStart),
        endAt: new Date(currentStart.getTime() + durationMs),
      });
    }

    currentStart = getNextRecurrenceDate(currentStart, event.recurrence);
    if (!["DAILY", "WEEKLY", "MONTHLY"].includes(event.recurrence as string)) {
      break;
    }
  }

  return instances;
}

/**
 * Generates recurring instances for tasks within a time window
 */
export function generateRecurringTaskInstances<T extends RecurringTask>(
  task: T,
  windowStart: Date,
  windowEnd: Date
): T[] {
  if (!task.recurrence || task.recurrence === "NONE") {
    return [task];
  }

  const instances: T[] = [];
  let currentStart = new Date(task.dueAt || task.createdAt || Date.now());
  const limitDate = task.recurrenceEnd ? new Date(task.recurrenceEnd) : addMonths(new Date(), 6);

  while (currentStart <= limitDate && currentStart <= windowEnd) {
    if (currentStart >= windowStart) {
      instances.push({
        ...task,
        id: `${task.id}_rec_${currentStart.getTime()}`,
        isRecurringInstance: true,
        originalId: task.id,
        dueAt: new Date(currentStart),
        completed: false,
      });
    }

    currentStart = getNextRecurrenceDate(currentStart, task.recurrence);
    if (!["DAILY", "WEEKLY", "MONTHLY"].includes(task.recurrence as string)) {
      break;
    }
  }

  return instances;
}
