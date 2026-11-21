import { HttpError, badRequest } from "@/shared/application/errors";
import { ROUTES } from "@/shared/config/routes";
import { getApiTranslator } from "@/shared/i18n/apiTranslator";
import { getVapidPublicKey as readVapidPublicKey, sendPushToUser } from "@/shared/infrastructure/webpush";
import {
  reminderWindows,
  selectDueReminders,
  vietnamClock,
  waterLogsSince,
  waterSlotClocks,
  type DueReminder,
} from "../domain/dueReminders";
import { notificationRepository } from "../infrastructure/notificationRepository";
import type { RegisterSubscriptionInput, TestPushInput, UnregisterSubscriptionInput } from "./notificationSchemas";

/** Keep sent markers for two days, longer than any reminder window, to bound table growth. */
const SENT_REMINDER_RETENTION_MS = 2 * 24 * 60 * 60 * 1000;

export type ReminderCounts = { tasks: number; events: number; water: number };

/** Validated public VAPID key, or an empty value if the server configuration is invalid. */
export function getVapidPublicKey() {
  return { publicKey: readVapidPublicKey() };
}

export async function registerPushSubscription(userId: string, input: RegisterSubscriptionInput) {
  const sub = await notificationRepository.upsertSubscription(userId, input.endpoint, input.keys);
  return { success: true, subscriptionId: sub.id };
}

export async function unregisterPushSubscription(userId: string, input: UnregisterSubscriptionInput) {
  if (input.endpoint) {
    await notificationRepository.deleteSubscription(userId, input.endpoint);
  }
  return { success: true };
}

/**
 * Send a test push to the signed-in user's own devices.
 * Report an error when the user has no registered devices or every delivery fails.
 */
export async function sendTestPush(userId: string, input: TestPushInput) {
  const t = getApiTranslator();
  const result = await sendPushToUser(userId, {
    title: input.title || t("notifications.testPush.defaultTitle"),
    body: input.message || t("notifications.testPush.defaultBody"),
    data: { url: ROUTES.dashboard },
  });
  if (result.total === 0) throw badRequest("notifications.testPush.noDevices");
  if (result.sent === 0) {
    throw new HttpError(502, "notifications.testPush.allFailed", { total: String(result.total) });
  }
  return {
    success: true,
    message: t("notifications.testPush.sent", { sent: String(result.sent), total: String(result.total) }),
    sent: result.sent,
    total: result.total,
  };
}

/** Reminders due at now for all users or a single userId. */
export async function findDueReminders(now: Date, userId?: string): Promise<DueReminder[]> {
  const slotTimes = waterSlotClocks(now).map((clock) => clock.time);
  const candidates = await notificationRepository.findReminderCandidates(
    reminderWindows(now),
    slotTimes,
    waterLogsSince(now),
    userId,
  );
  return selectDueReminders(now, candidates, getApiTranslator());
}

/**
 * Select previously unsent reminders due at now and mark them as sent immediately
 * so later cron, worker or app-open sync runs cannot deliver them again.
 */
export async function claimDueReminders(now: Date, userId?: string): Promise<DueReminder[]> {
  const reminders = await findDueReminders(now, userId);
  const fresh = await notificationRepository.claimReminderKeys(reminders.map((reminder) => reminder.key));
  return reminders.filter((reminder) => fresh.has(reminder.key));
}

/** Attempt a reminder push. A delivery failure should not block other reminders. */
export async function sendReminderPush(reminder: DueReminder): Promise<void> {
  await sendPushToUser(reminder.userId, {
    title: reminder.push.title,
    body: reminder.push.body,
    data: { url: reminder.push.url },
  }).catch(() => {});
}

async function deliverReminders(now: Date, userId?: string): Promise<ReminderCounts> {
  const processed: ReminderCounts = { tasks: 0, events: 0, water: 0 };
  const counterOf = { task: "tasks", event: "events", water: "water" } as const;

  const reminders = await claimDueReminders(now, userId);
  // sendReminderPush handles its own failures, allowing parallel delivery.
  await Promise.all(reminders.map(sendReminderPush));
  for (const reminder of reminders) processed[counterOf[reminder.kind]]++;
  return processed;
}

/** Send due reminders for all users and clean up old sent markers in the cron job. */
export async function runReminderCron(now: Date) {
  const processed = await deliverReminders(now);
  await notificationRepository.pruneSentReminders(new Date(now.getTime() - SENT_REMINDER_RETENTION_MS));
  return {
    success: true,
    timestamp: now.toISOString(),
    currentTimeStr: vietnamClock(now).time,
    processed,
  };
}

/**
 * Send a user's due reminders when they open or return to the app. This covers deployments without
 * a minutely cron job, such as serverless environments. Sent markers prevent duplicate cron deliveries.
 */
export async function syncUserReminders(userId: string, now = new Date()) {
  return { success: true, processed: await deliverReminders(now, userId), timestamp: now.toISOString() };
}
