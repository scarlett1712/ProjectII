import crypto from "crypto";
import { NextRequest } from "next/server";
import { apiErrorResponse } from "@/shared/presentation/apiError";
import { withErrorHandling } from "@/shared/presentation/http";
import { runReminderCron } from "../../application/notificationUseCases";

/**
 * Require Authorization: Bearer <CRON_SECRET>. When the secret is missing, allow only development requests.
 * Production rejects requests without a configured secret.
 */
export function isAuthorizedCron(authorization: string | null, cronSecret = process.env.CRON_SECRET): boolean {
  if (!cronSecret) return process.env.NODE_ENV !== "production";
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authorization ?? "");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

const handleCron = withErrorHandling(
  async (req: NextRequest) => {
    if (!isAuthorizedCron(req.headers.get("authorization"))) {
      return apiErrorResponse(401, "notifications.cron.unauthorized");
    }
    return runReminderCron(new Date());
  },
  { errorCode: "notifications.cron.failed" },
);

export const GET = handleCron;
export const POST = handleCron;
