import { exec } from "child_process";
import path from "path";
import { claimDueReminders, sendReminderPush } from "@/features/notifications/application/notificationUseCases";

const POLL_INTERVAL_MS = 30_000;

/** Poll every 30 seconds on a persistent server without cron. ReminderNotificationLog deduplicates deliveries. */
export function startBackgroundWorker() {
  console.info("[Background Worker] Starting background worker daemon...");

  setInterval(async () => {
    try {
      for (const reminder of await claimDueReminders(new Date())) {
        triggerNotification(reminder.notice.title, reminder.notice.message);
        void sendReminderPush(reminder);
      }
    } catch (e) {
      console.error("[Background Worker] Error checking notifications:", e);
    }
  }, POLL_INTERVAL_MS);
}

/** PowerShell toast on Windows development machines. */
function triggerNotification(title: string, message: string) {
  if (process.platform !== "win32" || process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return;
  }

  const scriptPath = path.join(process.cwd(), "src/features/notifications/infrastructure/notify.ps1");
  // Strip characters with special meaning in PowerShell or cmd command strings.
  const safe = (value: string) => value.replace(/[`"$%]/g, "");
  const cmd = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Title "${safe(title)}" -Message "${safe(message)}"`;

  exec(cmd, (error) => {
    if (error) {
      console.error(`[Background Worker] Notification failed: ${error.message}`);
    }
  });
}
