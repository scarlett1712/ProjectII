import { generateRecurringInstances, type RecurrenceType } from "@/shared/domain/recurrence";
import type { ApiTranslator } from "@/shared/i18n/apiTranslator";
import { formatTime } from "@/shared/i18n/format";
import { ROUTES } from "@/shared/config/routes";
import { APP_TIME_ZONE } from "@/shared/domain/time";

const MINUTE_MS = 60 * 1000;

/** Task reminders run from 15 minutes before the deadline to 30 minutes after it to allow for delayed runs. */
export const TASK_REMINDER_BEFORE_MS = 15 * MINUTE_MS;
export const TASK_REMINDER_AFTER_MS = 30 * MINUTE_MS;
/** Event reminders cover the 15 minutes before and after the start. */
export const EVENT_REMINDER_BEFORE_MS = 15 * MINUTE_MS;
export const EVENT_REMINDER_AFTER_MS = 15 * MINUTE_MS;
/** Water reminders cover the 30 minutes after the scheduled time. */
export const WATER_REMINDER_AFTER_MS = 30 * MINUTE_MS;


export interface ReminderWindow {
  start: Date;
  end: Date;
}

export interface ReminderWindows {
  /** Range of dueAt values eligible for task reminders. */
  task: ReminderWindow;
  /** Range of start times eligible for event reminders. */
  event: ReminderWindow;
}

export function reminderWindows(now: Date): ReminderWindows {
  const nowMs = now.getTime();
  return {
    task: { start: new Date(nowMs - TASK_REMINDER_AFTER_MS), end: new Date(nowMs + TASK_REMINDER_BEFORE_MS) },
    event: { start: new Date(nowMs - EVENT_REMINDER_AFTER_MS), end: new Date(nowMs + EVENT_REMINDER_BEFORE_MS) },
  };
}

export interface VietnamClock {
  /** Calendar date in Vietnam as YYYY-MM-DD. */
  day: string;
  /** Time in Vietnam as HH:mm, the format used by WaterReminderSlot.slotTime. */
  time: string;
}

const vietnamFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Convert a server timestamp to Vietnam's local date and time (UTC+7). */
export function vietnamClock(now: Date): VietnamClock {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of vietnamFormatter.formatToParts(now)) parts[part.type] = part.value;
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/**
 * Vietnamese local clock minutes in the preceding WATER_REMINDER_AFTER_MS window, including now. A matching water slot
 * remains eligible after a late or infrequent cron run. ReminderNotificationLog prevents repeat delivery.
 */
export function waterSlotClocks(now: Date): VietnamClock[] {
  const clocks: VietnamClock[] = [];
  const first = Math.ceil((now.getTime() - WATER_REMINDER_AFTER_MS) / MINUTE_MS) * MINUTE_MS;
  for (let ms = first; ms <= now.getTime(); ms += MINUTE_MS) clocks.push(vietnamClock(new Date(ms)));
  return clocks;
}

export interface ReminderTask {
  id: string;
  userId: string;
  title: string;
  dueAt: Date | null;
}

export type ReminderEvent = {
  id: string;
  userId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  recurrence?: RecurrenceType;
  recurrenceEnd?: Date | null;
};

export interface ReminderWaterSlot {
  id: string;
  userId: string;
  slotTime: string;
  amountMl: number;
}

/** Water intake record used to skip a reminder if the user already drank during the same hour. */
export interface ReminderWaterLog {
  userId: string;
  loggedAt: Date;
}

export type ReminderKind = "task" | "event" | "water";

export interface DueReminder {
  kind: ReminderKind;
  userId: string;
  /** Unique reminder occurrence key stored in ReminderNotificationLog to prevent repeat delivery. */
  key: string;
  push: { title: string; body: string; url: string };
  /** Short message for a local notification on the development machine. */
  notice: { title: string; message: string };
}

export interface ReminderCandidates {
  /** Incomplete tasks with reminders enabled and deadlines inside ReminderWindows.task. */
  tasks: ReminderTask[];
  /** Events with reminders enabled that recur or start in the window. Filter their occurrences against ReminderWindows.event here. */
  events: ReminderEvent[];
  /** Enabled water reminder slots with times in waterSlotClocks. */
  waterSlots: ReminderWaterSlot[];
  /** Recent water intake since waterLogsSince for users with eligible reminder slots. */
  waterLogs: ReminderWaterLog[];
}

/** Earliest timestamp needed to include all intake logs from the same hours as the candidate slots. */
export function waterLogsSince(now: Date): Date {
  return new Date(now.getTime() - WATER_REMINDER_AFTER_MS - 60 * MINUTE_MS);
}

/** Whether the user drank in the same local hour in Vietnam as slotTime on day. */
function drankDuringSlotHour(logs: ReminderWaterLog[], userId: string, day: string, slotTime: string): boolean {
  const slotHour = slotTime.slice(0, 2);
  return logs.some((log) => {
    if (log.userId !== userId) return false;
    const clock = vietnamClock(log.loggedAt);
    return clock.day === day && clock.time.slice(0, 2) === slotHour;
  });
}

/**
 * Select reminders due at now in order: tasks, events, then water.
 * Shared by the production cron job and development worker. The translator builds reminder titles and bodies.
 */
export function selectDueReminders(now: Date, candidates: ReminderCandidates, t: ApiTranslator): DueReminder[] {
  const windows = reminderWindows(now);
  const dayOfSlotTime = new Map(waterSlotClocks(now).map((clock) => [clock.time, clock.day]));
  return [
    ...candidates.tasks.flatMap((task) => taskReminder(task, t)),
    ...candidates.events.flatMap((event) => eventReminders(event, windows.event, t)),
    ...candidates.waterSlots.flatMap((slot) => {
      const day = dayOfSlotTime.get(slot.slotTime);
      if (!day || drankDuringSlotHour(candidates.waterLogs, slot.userId, day, slot.slotTime)) return [];
      return [waterReminder(slot, day, t)];
    }),
  ];
}

function taskReminder(task: ReminderTask, t: ApiTranslator): DueReminder[] {
  if (!task.dueAt) return [];
  const body = t("reminder.task.body", { title: task.title });
  return [
    {
      kind: "task",
      userId: task.userId,
      key: `task_${task.id}_${task.dueAt.getTime()}`,
      push: { title: t("reminder.task.pushTitle"), body, url: ROUTES.calendar },
      notice: { title: t("reminder.task.noticeTitle"), message: body },
    },
  ];
}

function eventReminders(event: ReminderEvent, window: ReminderWindow, t: ApiTranslator): DueReminder[] {
  // generateRecurringInstances returns nonrecurring events regardless of the window. Filter them by start time.
  const instances = generateRecurringInstances(event, window.start, window.end).filter((instance) => {
    const startMs = new Date(instance.startAt).getTime();
    return startMs >= window.start.getTime() && startMs <= window.end.getTime();
  });
  return instances.map((instance) => {
    const startAt = new Date(instance.startAt);
    const timeStr = formatTime(startAt, { timeZone: APP_TIME_ZONE });
    const body = t("reminder.event.body", { time: timeStr, title: instance.title });
    return {
      kind: "event",
      userId: event.userId,
      key: `event_${event.id}_${startAt.getTime()}`,
      push: { title: t("reminder.event.pushTitle"), body, url: ROUTES.calendar },
      notice: { title: t("reminder.event.noticeTitle"), message: body },
    };
  });
}

function waterReminder(slot: ReminderWaterSlot, day: string, t: ApiTranslator): DueReminder {
  return {
    kind: "water",
    userId: slot.userId,
    key: `water_${slot.id}_${day}_${slot.slotTime}`,
    push: {
      title: t("reminder.water.pushTitle"),
      body: t("reminder.water.pushBody", { amountMl: String(slot.amountMl), slotTime: slot.slotTime }),
      url: ROUTES.nutrition,
    },
    notice: {
      title: t("reminder.water.noticeTitle"),
      message: t("reminder.water.noticeMessage", { amountMl: String(slot.amountMl), slotTime: slot.slotTime }),
    },
  };
}
