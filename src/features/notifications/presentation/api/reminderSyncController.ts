import { withUser } from "@/shared/presentation/http";
import { syncUserReminders } from "../../application/notificationUseCases";

/** Called when the app opens or the tab regains focus. Limit to 12 requests per minute per IP. */
export const POST = withUser((_req, userId) => syncUserReminders(userId), {
  errorCode: "common.serverError",
  rateLimit: { keyPrefix: "reminder-sync", limit: 12, windowMs: 60_000 },
});
