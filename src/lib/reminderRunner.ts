import { exec } from "child_process";
import path from "path";
import { db } from "./db";
import { sendPushToUser } from "./webpush";
import { generateRecurringInstances } from "./recurrence";

// Cache of already-notified keys with timestamps to prevent duplicate alerts
// Key format: task_<userId>_<taskId>_<time> | event_<userId>_<eventId>_<time> | water_<userId>_<slotId>_<date>_<time>
const notifiedKeys = new Map<string, number>();

function cleanupOldKeys() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
  for (const [key, timestamp] of notifiedKeys.entries()) {
    if (timestamp < cutoff) {
      notifiedKeys.delete(key);
    }
  }
}

export interface ReminderProcessResult {
  tasks: number;
  events: number;
  water: number;
}

/**
 * Trigger local Windows toast notification during local development
 */
function triggerWindowsToast(title: string, message: string) {
  if (process.platform !== "win32" || process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return;
  }

  try {
    const scriptPath = path.join(process.cwd(), "src/lib/notify.ps1");
    const safeTitle = title.replace(/[`"$]/g, "");
    const safeMessage = message.replace(/[`"$]/g, "");
    const cmd = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Title "${safeTitle}" -Message "${safeMessage}"`;

    exec(cmd, (error) => {
      if (error) {
        console.error(`[ReminderRunner] Windows toast failed: ${error.message}`);
      }
    });
  } catch (err) {
    console.error("[ReminderRunner] Error triggering Windows toast:", err);
  }
}

/**
 * Central reminder processing engine.
 * Supports running for all users (background worker / cron) or a single target user (sync on mobile resume).
 */
export async function processReminders(targetUserId?: string): Promise<ReminderProcessResult> {
  const result: ReminderProcessResult = { tasks: 0, events: 0, water: 0 };
  const now = new Date();
  const nowMs = now.getTime();

  // Clean cache periodically
  if (notifiedKeys.size > 2000) {
    cleanupOldKeys();
  }

  // 1. Calculate Vietnam Time (Asia/Ho_Chi_Minh, UTC+7)
  const vnFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = vnFormatter.formatToParts(now);
  const p: Record<string, string> = {};
  parts.forEach((item) => {
    p[item.type] = item.value;
  });

  const todayStr = `${p.year}-${p.month}-${p.day}`;
  const currentHour = parseInt(p.hour, 10);
  const currentMinute = parseInt(p.minute, 10);
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  try {
    // ----------------------------------------------------
    // 2. CHECK WATER REMINDER SLOTS
    // ----------------------------------------------------
    const slotWhere: any = { enabled: true };
    if (targetUserId) {
      slotWhere.userId = targetUserId;
    }

    const slots = await db.waterReminderSlot.findMany({
      where: slotWhere,
    });

    for (const slot of slots) {
      if (!slot.slotTime) continue;
      const [sH, sM] = slot.slotTime.split(":").map(Number);
      if (isNaN(sH) || isNaN(sM)) continue;

      const slotTotalMinutes = sH * 60 + sM;
      // Due if scheduled time has passed and within 30-minute window
      const isDue =
        currentTotalMinutes >= slotTotalMinutes &&
        currentTotalMinutes - slotTotalMinutes <= 30;

      if (isDue) {
        const key = `water_${slot.userId}_${slot.id}_${todayStr}_${slot.slotTime}`;
        if (!notifiedKeys.has(key)) {
          notifiedKeys.set(key, nowMs);
          result.water++;

          const title = "Nhắc nhở uống nước ⭐";
          const body = `Đã đến giờ uống nước: ${slot.amountMl}ml (${slot.slotTime}) 💧`;

          triggerWindowsToast(title, body);
          await sendPushToUser(slot.userId, {
            title,
            body,
            data: { url: "/nutrition" },
          }).catch((err) => {
            console.error(`[ReminderRunner] Push water failed for user ${slot.userId}:`, err);
          });
        }
      }
    }

    // ----------------------------------------------------
    // 3. CHECK DUE TASKS
    // ----------------------------------------------------
    const taskWhere: any = {
      completed: false,
      notification: true,
      dueAt: {
        not: null,
        // Match tasks due between 15 minutes before and 30 minutes after now
        gte: new Date(nowMs - 30 * 60 * 1000),
        lte: new Date(nowMs + 15 * 60 * 1000),
      },
    };
    if (targetUserId) {
      taskWhere.userId = targetUserId;
    }

    const tasks = await db.taskItem.findMany({
      where: taskWhere,
    });

    for (const task of tasks) {
      if (!task.dueAt) continue;
      const dueTime = task.dueAt.getTime();
      const key = `task_${task.userId}_${task.id}_${dueTime}`;

      if (!notifiedKeys.has(key)) {
        notifiedKeys.set(key, nowMs);
        result.tasks++;

        const title = "Nhắc nhở công việc ⭐";
        const body = `Đã đến hạn nhiệm vụ: "${task.title}"`;

        triggerWindowsToast(title, body);
        await sendPushToUser(task.userId, {
          title,
          body,
          data: { url: "/calendar" },
        }).catch((err) => {
          console.error(`[ReminderRunner] Push task failed for user ${task.userId}:`, err);
        });
      }
    }

    // ----------------------------------------------------
    // 4. CHECK CALENDAR EVENTS (including recurring)
    // ----------------------------------------------------
    const startWindow = new Date(nowMs - 15 * 60 * 1000);
    const endWindow = new Date(nowMs + 15 * 60 * 1000);

    const eventWhere: any = { notification: true };
    if (targetUserId) {
      eventWhere.userId = targetUserId;
    }

    const events = await db.calendarEvent.findMany({
      where: eventWhere,
    });

    for (const event of events) {
      const instances = generateRecurringInstances(event, startWindow, endWindow);
      for (const inst of instances) {
        const instTime = new Date(inst.startAt).getTime();
        const key = `event_${event.userId}_${event.id}_${instTime}`;

        if (!notifiedKeys.has(key)) {
          notifiedKeys.set(key, nowMs);
          result.events++;

          const timeStr = new Date(inst.startAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
          });

          const title = "Sự kiện sắp diễn ra ⭐";
          const body = `Lúc ${timeStr}: "${inst.title}"`;

          triggerWindowsToast(title, body);
          await sendPushToUser(event.userId, {
            title,
            body,
            data: { url: "/calendar" },
          }).catch((err) => {
            console.error(`[ReminderRunner] Push event failed for user ${event.userId}:`, err);
          });
        }
      }
    }
  } catch (error) {
    console.error("[ReminderRunner] Error checking reminders:", error);
  }

  return result;
}
