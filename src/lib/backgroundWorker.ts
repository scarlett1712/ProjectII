import { processReminders } from "./reminderRunner";

let intervalId: NodeJS.Timeout | null = null;

export function startBackgroundWorker() {
  if (intervalId) return; // Prevent multiple intervals

  console.log("[Background Worker] Starting background reminder worker daemon (every 30s)...");

  // Initial check
  processReminders().catch((err) => {
    console.error("[Background Worker] Initial reminder check failed:", err);
  });

  intervalId = setInterval(async () => {
    try {
      await processReminders();
    } catch (e) {
      console.error("[Background Worker] Error checking notifications:", e);
    }
  }, 30000); // Check every 30 seconds
}
