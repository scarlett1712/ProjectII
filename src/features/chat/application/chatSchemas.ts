import { z } from "zod";
import { messageKey } from "@/shared/application/errors";

/** Maximum message length to bound LLM costs and database storage. */
export const MAX_CHAT_MESSAGE_LENGTH = 4000;
/** Maximum chat session title length. */
export const MAX_SESSION_TITLE_LENGTH = 100;

/** Maximum number of sessions that can be deleted in one request. */
export const MAX_DELETE_SESSIONS = 50;

/** Parse comma-separated sessionId query values into a list of 1–50 IDs. */
export const deleteSessionsSchema = z
  .string({ error: messageKey("chat.missingSessionId") })
  .min(1, messageKey("chat.missingSessionId"))
  .transform((v) => v.split(",").map((id) => id.trim()).filter(Boolean))
  .pipe(
    z
      .array(z.string())
      .min(1, messageKey("chat.missingSessionId"))
      .max(MAX_DELETE_SESSIONS, messageKey("chat.tooManySessions")),
  );

const MISSING_SESSION_OR_TITLE = messageKey("chat.missingSessionIdOrTitle");

/** POST /api/chat starts a session for reset or newSession requests and otherwise sends a message. */
export const chatPostSchema = z.object({
  reset: z.unknown().transform(Boolean).optional(),
  newSession: z.unknown().transform(Boolean).optional(),
  // Preserve the previous String(content ?? "") coercion.
  content: z
    .unknown()
    .optional()
    .transform((v) => (v == null ? "" : String(v)))
    .pipe(z.string().max(MAX_CHAT_MESSAGE_LENGTH, messageKey("chat.contentTooLong"))),
  sessionId: z
    .unknown()
    .optional()
    .transform((v) => (typeof v === "string" && v ? v : undefined)),
});

export const renameSessionSchema = z.object(
  {
    sessionId: z.string({ error: MISSING_SESSION_OR_TITLE }).min(1, MISSING_SESSION_OR_TITLE),
    title: z
      .string({ error: MISSING_SESSION_OR_TITLE })
      .trim()
      .min(1, MISSING_SESSION_OR_TITLE)
      .max(MAX_SESSION_TITLE_LENGTH, messageKey("chat.titleTooLong")),
  },
  { error: MISSING_SESSION_OR_TITLE },
);
