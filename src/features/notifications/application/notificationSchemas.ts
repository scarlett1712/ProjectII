import { z } from "zod";
import { messageKey } from "@/shared/application/errors";

const INVALID_SUBSCRIPTION = messageKey("notifications.invalidSubscription");

export const registerSubscriptionSchema = z.object(
  {
    endpoint: z.string({ error: INVALID_SUBSCRIPTION }).min(1, INVALID_SUBSCRIPTION),
    keys: z.object(
      {
        p256dh: z.string({ error: INVALID_SUBSCRIPTION }).min(1, INVALID_SUBSCRIPTION),
        auth: z.string({ error: INVALID_SUBSCRIPTION }).min(1, INVALID_SUBSCRIPTION),
      },
      { error: INVALID_SUBSCRIPTION },
    ),
  },
  { error: INVALID_SUBSCRIPTION },
);

/** Skip requests with no endpoint or an empty body, matching previous behavior. */
export const unregisterSubscriptionSchema = z
  .object({ endpoint: z.string().optional().catch(undefined) })
  .nullish()
  .catch(undefined)
  .transform((v) => ({ endpoint: v?.endpoint || undefined }));

/** Use the defaults when the title or body is empty or is not a string. */
export const testPushSchema = z
  .object({
    title: z.string().optional().catch(undefined),
    message: z.string().optional().catch(undefined),
  })
  .nullish()
  .catch(undefined)
  .transform((v) => ({ title: v?.title || undefined, message: v?.message || undefined }));

export interface RegisterSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface UnregisterSubscriptionInput {
  endpoint?: string;
}

export interface TestPushInput {
  title?: string;
  message?: string;
}
