import { db } from "@/shared/infrastructure/db";
import type { ReminderCandidates, ReminderWindows } from "../domain/dueReminders";

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export const notificationRepository = {
  /** Associate the subscription endpoint with the current user, reassigning an existing endpoint if necessary. */
  upsertSubscription(userId: string, endpoint: string, keys: PushSubscriptionKeys) {
    return db.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth, updatedAt: new Date() },
    });
  },

  async deleteSubscription(userId: string, endpoint: string) {
    await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
  },

  /**
   * Input to selectDueReminders for all users in cron and worker runs, or a single user
   * when syncing on app open.
   */
  async findReminderCandidates(
    windows: ReminderWindows,
    slotTimes: string[],
    waterLogsSince: Date,
    userId?: string,
  ): Promise<ReminderCandidates> {
    const ofUser = userId ? { userId } : {};
    const [tasks, events, waterSlots] = await Promise.all([
      db.taskItem.findMany({
        where: {
          ...ofUser,
          completed: false,
          notification: true,
          dueAt: { not: null, gte: windows.task.start, lte: windows.task.end },
        },
        select: { id: true, userId: true, title: true, dueAt: true },
      }),
      db.calendarEvent.findMany({
        // Fetch nonrecurring events starting in the window. The domain layer expands recurring events.
        where: {
          ...ofUser,
          notification: true,
          OR: [
            { startAt: { gte: windows.event.start, lte: windows.event.end } },
            { AND: [{ recurrence: { not: null } }, { recurrence: { not: "NONE" } }] },
          ],
        },
        select: {
          id: true,
          userId: true,
          title: true,
          startAt: true,
          endAt: true,
          recurrence: true,
          recurrenceEnd: true,
        },
      }),
      db.waterReminderSlot.findMany({
        where: { ...ofUser, enabled: true, slotTime: { in: slotTimes } },
        select: { id: true, userId: true, slotTime: true, amountMl: true },
      }),
    ]);
    const slotUserIds = [...new Set(waterSlots.map((slot) => slot.userId))];
    const waterLogs = slotUserIds.length
      ? await db.waterLog.findMany({
          where: { userId: { in: slotUserIds }, loggedAt: { gte: waterLogsSince } },
          select: { userId: true, loggedAt: true },
        })
      : [];
    return { tasks, events, waterSlots, waterLogs };
  },

  /** Mark reminders as sent and return only newly recorded keys for delivery. */
  async claimReminderKeys(keys: string[]): Promise<Set<string>> {
    const unique = [...new Set(keys)];
    if (unique.length === 0) return new Set();
    const sent = await db.reminderNotificationLog.findMany({ where: { key: { in: unique } }, select: { key: true } });
    const sentKeys = new Set(sent.map((row) => row.key));
    const fresh = unique.filter((key) => !sentKeys.has(key));
    if (fresh.length > 0) {
      await db.reminderNotificationLog.createMany({ data: fresh.map((key) => ({ key })), skipDuplicates: true });
    }
    return new Set(fresh);
  },

  /** Remove sent markers older than before, outside all reminder windows. */
  async pruneSentReminders(before: Date) {
    await db.reminderNotificationLog.deleteMany({ where: { createdAt: { lt: before } } });
  },
};
