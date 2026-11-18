import { exec } from "child_process";
import path from "path";
import { db } from "./db";
import { sendPushToUser } from "./webpush";
import { generateRecurringInstances } from "./recurrence";

const notifiedKeys = new Set<string>();

// Run clean up once a day to prevent Set from growing indefinitely
setInterval(() => {
  notifiedKeys.clear();
}, 24 * 60 * 60 * 1000);

export function startBackgroundWorker() {
  console.log("[Background Worker] Starting background worker daemon...");

  setInterval(async () => {
    try {
      const now = new Date();
      const nowMs = now.getTime();

      // 1. Check Tasks
      const tasks = await db.taskItem.findMany({
        where: {
          completed: false,
          notification: true,
          dueAt: {
            not: null,
            gte: new Date(nowMs - 15 * 60 * 1000), // 15 mins ago
            lte: new Date(nowMs + 1 * 60 * 1000)  // 1 min future
          }
        }
      });

      for (const task of tasks) {
        if (!task.dueAt) continue;
        const key = `task_${task.id}_${task.dueAt.getTime()}`;
        if (!notifiedKeys.has(key)) {
          notifiedKeys.add(key);
          triggerNotification("Nhắc nhở công việc", `Đã đến hạn: "${task.title}"`);
          sendPushToUser(task.userId, {
            title: "Nhắc nhở công việc ⭐",
            body: `Đã đến hạn: "${task.title}"`,
            data: { url: "/calendar" },
          }).catch(() => {});
        }
      }

      // 2. Check Calendar Events
      const startWindow = new Date(nowMs - 15 * 60 * 1000);
      const endWindow = new Date(nowMs + 1 * 60 * 1000);

      const events = await db.calendarEvent.findMany({
        where: {
          notification: true
        }
      });

      for (const event of events) {
        const instances = generateRecurringInstances(event, startWindow, endWindow);
        for (const inst of instances) {
          const key = `event_${event.id}_${inst.startAt.getTime()}`;
          if (!notifiedKeys.has(key)) {
            notifiedKeys.add(key);
            
            // Format time nicely
            const timeStr = inst.startAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
            triggerNotification("Sự kiện sắp diễn ra", `Lúc ${timeStr}: "${inst.title}"`);
            sendPushToUser(event.userId, {
              title: "Sự kiện sắp diễn ra ⭐",
              body: `Lúc ${timeStr}: "${inst.title}"`,
              data: { url: "/calendar" },
            }).catch(() => {});
          }
        }
      }

      // 3. Check Water Reminder Slots (Convert server UTC to Vietnam Time UTC+7)
      const nowUtc = new Date();
      // Chuyển sang giờ Việt Nam (UTC+7 / Asia/Ho_Chi_Minh)
      const vnFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const parts = vnFormatter.formatToParts(nowUtc);
      const partObj: Record<string, string> = {};
      parts.forEach((p) => { partObj[p.type] = p.value; });

      const dayStr = `${partObj.year}-${partObj.month}-${partObj.day}`;
      const currentTimeStr = `${partObj.hour}:${partObj.minute}`;

      const slots = await db.waterReminderSlot.findMany({
        where: { enabled: true }
      });

      for (const slot of slots) {
        if (slot.slotTime === currentTimeStr) {
          const key = `water_${slot.id}_${dayStr}_${slot.slotTime}`;
          if (!notifiedKeys.has(key)) {
            notifiedKeys.add(key);
            triggerNotification("Nhắc nhở uống nước", `Đến giờ uống nước: ${slot.amountMl}ml (${slot.slotTime})`);
            sendPushToUser(slot.userId, {
              title: "Nhắc nhở uống nước ⭐",
              body: `Đã đến giờ uống nước: ${slot.amountMl}ml (${slot.slotTime}) 💧`,
              data: { url: "/dashboard" },
            }).catch(() => {});
          }
        }
      }

    } catch (e) {
      console.error("[Background Worker] Error checking notifications:", e);
    }
  }, 30000); // 30 seconds
}

function triggerNotification(title: string, message: string) {
  // Only trigger local powershell toast if running locally on Windows in development
  if (process.platform !== "win32" || process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return;
  }

  const scriptPath = path.join(process.cwd(), "src/lib/notify.ps1");
  const safeTitle = title.replace(/[`"$]/g, "");
  const safeMessage = message.replace(/[`"$]/g, "");
  const cmd = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Title "${safeTitle}" -Message "${safeMessage}"`;
  
  exec(cmd, (error) => {
    if (error) {
      console.error(`[Background Worker] Notification failed: ${error.message}`);
    }
  });
}
