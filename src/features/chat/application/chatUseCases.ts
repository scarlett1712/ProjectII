import { getApiTranslator } from "@/shared/i18n/apiTranslator";
import { startOfAppDay } from "@/shared/domain/time";
import { buildDynamicSystemPrompt } from "../domain/systemPrompt";
import { chatRepository } from "../infrastructure/chatRepository";
import { chatCompletionClient } from "../infrastructure/chatCompletionClient";
import type { ChatCompletionPort, LlmMessage } from "./chatCompletionPort";
import { executeChatTool, type ToolArgs } from "./chatToolExecutor";
import { DRAFT_CHAT_SESSION_ID } from "@/shared/config/chat";

/**
 * Store the new-session title in the default language so automatic title generation can recognize it
 * regardless of the user's locale.
 */
export const NEW_SESSION_TITLE = getApiTranslator()("chat.newSessionTitle");
const HISTORY_LIMIT = 15;
const MAX_TOOL_ROUNDS = 4;

/** A draft session is persisted when the user sends the first message. */
export const draftSession = () => ({ id: DRAFT_CHAT_SESSION_ID, title: NEW_SESSION_TITLE, updatedAt: new Date().toISOString() });

/** Allow newly created empty sessions time to receive a concurrent message before cleaning them up. */
const EMPTY_SESSION_GRACE_MS = 60_000;

/** Remove old empty sessions and return the session list, active session and its messages. */
export async function getChatState(userId: string, requestedSessionId: string | null, now = new Date()) {
  const rawSessions = await chatRepository.listSessionsWithMessageCount(userId);

  const emptySessionIds = rawSessions
    .filter((s) => s._count.messages === 0 && now.getTime() - new Date(s.createdAt).getTime() > EMPTY_SESSION_GRACE_MS)
    .map((s) => s.id);
  if (emptySessionIds.length > 0) {
    try {
      await chatRepository.deleteSessions(userId, emptySessionIds);
    } catch (err) {
      console.error("Failed to delete empty chat sessions:", err);
    }
  }

  const sessions = rawSessions
    .filter((s) => s._count.messages > 0)
    .map(({ _count, ...s }) => s);

  const session =
    requestedSessionId && requestedSessionId !== DRAFT_CHAT_SESSION_ID
      ? await chatRepository.findSession(userId, requestedSessionId)
      : draftSession();

  const messages = session && session.id !== DRAFT_CHAT_SESSION_ID ? await chatRepository.listMessages(userId, session.id) : [];

  return { sessions, session, messages };
}

/** Save the user's message, run the LLM and tool loop, then save and return the reply. */
export async function sendChatMessage(
  userId: string,
  input: { content: string; sessionId?: string },
  llm: ChatCompletionPort = chatCompletionClient,
) {
  const { content } = input;
  const existing =
    input.sessionId && input.sessionId !== DRAFT_CHAT_SESSION_ID ? await chatRepository.findSession(userId, input.sessionId) : null;
  const session = existing ?? (await chatRepository.createSession(userId, NEW_SESSION_TITLE));

  await chatRepository.createMessage(userId, session.id, "USER", content);

  const [history, snapshot] = await Promise.all([
    chatRepository.recentHistory(userId, session.id, HISTORY_LIMIT),
    chatRepository.loadUserSnapshot(userId, startOfAppDay(new Date())),
  ]);

  const apiMessages: LlmMessage[] = [
    { role: "system", content: buildDynamicSystemPrompt(snapshot) },
    ...history.map((m): LlmMessage => ({
      role: m.role.toLowerCase() === "user" ? "user" : "assistant",
      content: m.content,
    })),
  ];

  const assistantReply = await runToolLoop(llm, apiMessages, userId, session.id);

  if (session.title === NEW_SESSION_TITLE && content.length > 5) {
    const newTitle = content.slice(0, 25) + (content.length > 25 ? "..." : "");
    await chatRepository.renameSession(userId, session.id, newTitle);
    session.title = newTitle;
  }

  const reply = await chatRepository.createMessage(userId, session.id, "ASSISTANT", assistantReply);
  await chatRepository.touchSession(userId, session.id);

  return { reply, session };
}

async function runToolLoop(llm: ChatCompletionPort, apiMessages: LlmMessage[], userId: string, sessionId: string) {
  try {
    let response = await llm.complete(apiMessages);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const message = response.choices?.[0]?.message;
      if (!message?.tool_calls) break;

      apiMessages.push(message);
      for (const toolCall of message.tool_calls) {
        const result = await runTool(toolCall.function.name, toolCall.function.arguments, userId, sessionId);
        apiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(result),
        });
      }
      response = await llm.complete(apiMessages);
    }

    return response.choices?.[0]?.message?.content || getApiTranslator()("chat.fallbackReply");
  } catch (error) {
    console.error("Chat backend error:", error);
    return getApiTranslator()("chat.aiBusyReply");
  }
}

/**
 * Return a tool failure to the LLM as that tool's result so it can explain the error to the user.
 * This preserves the current turn when earlier tools have already written data.
 */
async function runTool(name: string, rawArgs: string | Record<string, unknown>, userId: string, sessionId: string) {
  try {
    return await executeChatTool(name, parseToolArgs(rawArgs), userId, sessionId);
  } catch (error) {
    console.error(`Chat tool ${name} failed:`, error);
    return { error: `Công cụ ${name} gặp lỗi, chưa thực hiện được.` };
  }
}

function parseToolArgs(raw: string | Record<string, unknown>): ToolArgs {
  if (typeof raw !== "string") return raw ?? {};
  try {
    return JSON.parse(raw) as ToolArgs;
  } catch {
    console.error("Failed to parse tool arguments:", raw);
    return {};
  }
}

export function renameChatSession(userId: string, sessionId: string, title: string) {
  return chatRepository.renameSession(userId, sessionId, title.trim());
}

export function deleteChatSessions(userId: string, sessionIds: string[]) {
  return chatRepository.deleteSessions(userId, sessionIds);
}
