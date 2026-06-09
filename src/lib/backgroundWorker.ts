import { exec } from "child_process";
import path from "path";
import { db } from "./db";
import { addDays, addWeeks, addMonths } from "date-fns";

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
        const instances = getActiveRecurringInstances(event, startWindow, endWindow);
        for (const inst of instances) {
          const key = `event_${event.id}_${inst.startAt.getTime()}`;
          if (!notifiedKeys.has(key)) {
            notifiedKeys.add(key);
            
            // Format time nicely
            const timeStr = inst.startAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
            triggerNotification("Sự kiện sắp diễn ra", `Lúc ${timeStr}: "${inst.title}"`);
          }
        }
      }

      // 3. Check Water Reminder Slots
      const today = new Date();
      const dayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
      const currentHour = today.getHours().toString().padStart(2, "0");
      const currentMinute = today.getMinutes().toString().padStart(2, "0");
      const currentTimeStr = `${currentHour}:${currentMinute}`; // HH:MM

      const slots = await db.waterReminderSlot.findMany({
        where: { enabled: true }
      });

      for (const slot of slots) {
        if (slot.slotTime === currentTimeStr) {
          const key = `water_${slot.id}_${dayStr}_${slot.slotTime}`;
          if (!notifiedKeys.has(key)) {
            notifiedKeys.add(key);
            triggerNotification("Nhắc nhở uống nước", `Đến giờ uống nước: ${slot.amountMl}ml (${slot.slotTime})`);
          }
        }
      }

    } catch (e) {
      console.error("[Background Worker] Error checking notifications:", e);
    }
  }, 30000); // 30 seconds
}

function triggerNotification(title: string, message: string) {
  const scriptPath = path.join(process.cwd(), "src/lib/notify.ps1");
  const cmd = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Title "${title.replace(/"/g, '`"')}" -Message "${message.replace(/"/g, '`"')}"`;
  
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Background Worker] Notification failed: ${error.message}`);
    }
  });
}

function getActiveRecurringInstances(event: any, startWindow: Date, endWindow: Date) {
  if (!event.recurrence || event.recurrence === "NONE") {
    return [event];
  }

  const instances = [];
  let currentStart = new Date(event.startAt);
  let currentEnd = new Date(event.endAt);
  const limitDate = event.recurrenceEnd ? new Date(event.recurrenceEnd) : addMonths(new Date(), 6);
  const durationMs = currentEnd.getTime() - currentStart.getTime();

  while (currentStart <= limitDate) {
    if (currentStart >= startWindow && currentStart <= endWindow) {
      instances.push({
        ...event,
        startAt: new Date(currentStart),
        endAt: new Date(currentStart.getTime() + durationMs),
      });
    }

    if (event.recurrence === "DAILY") {
      currentStart = addDays(currentStart, 1);
    } else if (event.recurrence === "WEEKLY") {
      currentStart = addWeeks(currentStart, 1);
    } else if (event.recurrence === "MONTHLY") {
      currentStart = addMonths(currentStart, 1);
    } else {
      break;
    }
  }
  return instances;
}
