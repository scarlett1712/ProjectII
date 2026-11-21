/** Serverless environments rely on cron and app-open sync because they have no persistent worker process. */
const isServerless = () => Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);

/**
 * Next.js calls this once during server startup. On persistent development or self-hosted production servers,
 * start the 30-second reminder worker. ReminderNotificationLog deduplicates its deliveries against cron.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || isServerless()) return;

  const globalForWorker = globalThis as unknown as { backgroundWorkerStarted?: boolean };
  if (globalForWorker.backgroundWorkerStarted) return;
  globalForWorker.backgroundWorkerStarted = true;

  try {
    const { startBackgroundWorker } = await import("@/features/notifications/infrastructure/backgroundWorker");
    startBackgroundWorker();
  } catch (err) {
    console.error("Failed to start background worker:", err);
  }
}
