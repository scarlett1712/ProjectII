import { withUser } from "@/shared/presentation/http";
import { testPushSchema } from "../../application/notificationSchemas";
import { sendTestPush } from "../../application/notificationUseCases";

export const POST = withUser(
  async (req, userId) => {
    // Use the default title and body for missing or malformed input.
    const body: unknown = await req.json().catch(() => ({}));
    return sendTestPush(userId, testPushSchema.parse(body));
  },
  { errorCode: "common.serverError" },
);
