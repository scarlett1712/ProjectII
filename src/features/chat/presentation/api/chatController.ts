import { readJson, withErrorHandling, withUser } from "@/shared/presentation/http";
import { apiErrorResponse } from "@/shared/presentation/apiError";
import { requireUserId } from "@/shared/presentation/requireUser";
import { chatPostSchema, deleteSessionsSchema, renameSessionSchema } from "../../application/chatSchemas";
import { buildGuestReply } from "../../domain/guestReply";
import {
  deleteChatSessions,
  draftSession,
  getChatState,
  renameChatSession,
  sendChatMessage,
} from "../../application/chatUseCases";

export const GET = withUser((req, userId) =>
  getChatState(userId, new URL(req.url).searchParams.get("sessionId")),
);

/** Guests can chat using predefined replies, so this endpoint also accepts unauthenticated requests. */
export const POST = withErrorHandling(
  async (req) => {
    const auth = await requireUserId(req);
    const body = chatPostSchema.parse((await readJson(req)) ?? {});

    if (body.reset || body.newSession) {
      return auth.response ? { session: null, messages: [] } : { session: draftSession(), messages: [] };
    }

    const { content, sessionId } = body;
    if (!content.trim() && !sessionId) {
      return apiErrorResponse(400, "chat.contentOrSessionRequired");
    }

    if (auth.response) {
      return { guest: true, reply: { role: "ASSISTANT", content: buildGuestReply(content) } };
    }

    return sendChatMessage(auth.userId, { content, sessionId });
  },
  { rateLimit: { keyPrefix: "chat", limit: 40, windowMs: 60_000 } },
);

export const PATCH = withUser(
  async (req, userId) => {
    const { sessionId, title } = renameSessionSchema.parse((await readJson(req)) ?? {});
    return renameChatSession(userId, sessionId, title);
  },
  { errorCode: "chat.updateSessionFailed" },
);

export const DELETE = withUser(
  async (req, userId) => {
    const ids = deleteSessionsSchema.parse(new URL(req.url).searchParams.get("sessionId"));
    await deleteChatSessions(userId, ids);
    return { ok: true };
  },
  { errorCode: "chat.deleteSessionFailed" },
);
