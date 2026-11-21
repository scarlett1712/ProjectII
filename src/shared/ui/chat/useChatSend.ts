"use client";

import { useState } from "react";
import { apiRequest } from "@/shared/client/api";
import { API_ROUTES } from "@/shared/config/routes";
import type { ChatMessage } from "./types";

export interface ChatSendSession {
  id: string;
}

type ServerReply = { id?: string; role?: string; content: string; createdAt?: string };

export interface UseChatSendOptions<S extends ChatSendSession> {
  initialMessages?: ChatMessage[] | (() => ChatMessage[]);
  /** Session sent with the request. Omit it for guests. */
  sessionId?: string;
  /** When supplied, insert a temporary assistant message and replace it with the reply. Otherwise append the reply. */
  pendingContent?: string;
  /** Fallback for a successful server response with no reply field. */
  fallbackReply: string;
  errorMessage: (error: unknown) => string;
  /** The server returned a new or updated session. isCurrentView indicates whether the sender still has that view open. */
  onSession?: (session: S, isCurrentView: boolean) => void;
  /** Called at send time. Returns a predicate for discarding a late reply when the user has since left the view. */
  trackView?: () => () => boolean;
}

const newMessageId = () => crypto.randomUUID();

/** Message list and chat API submission shared by the full chat, quick chat and guest chat. */
export function useChatSend<S extends ChatSendSession = ChatSendSession>({
  initialMessages = [],
  sessionId,
  pendingContent,
  fallbackReply,
  errorMessage,
  onSession,
  trackView,
}: UseChatSendOptions<S>) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  // Count pending messages so sending stays true until every concurrent quick chat request finishes.
  const [pendingCount, setPendingCount] = useState(0);

  async function send(content: string) {
    if (!content.trim()) return;
    const isCurrentView = trackView?.() ?? (() => true);
    const createdAt = new Date().toISOString();
    // Give each pending message its own ID so replies replace the correct placeholder.
    const pending = pendingContent === undefined ? null : { id: newMessageId(), content: pendingContent };
    const pendingId = pending?.id;
    setMessages((prev) => [
      ...prev,
      { id: newMessageId(), role: "USER", content, createdAt },
      ...(pending ? [{ ...pending, role: "ASSISTANT" as const, createdAt }] : []),
    ]);
    setPendingCount((n) => n + 1);

    const settle = (reply: ServerReply) => {
      if (!isCurrentView()) return;
      const message: ChatMessage = {
        id: pendingId ?? reply.id ?? newMessageId(),
        role: reply.role === "USER" ? "USER" : "ASSISTANT",
        content: reply.content,
        createdAt: reply.createdAt ?? new Date().toISOString(),
      };
      setMessages((prev) => (pendingId ? prev.map((m) => (m.id === pendingId ? message : m)) : [...prev, message]));
    };

    try {
      const data = await apiRequest<{ reply?: ServerReply; session?: S }>(API_ROUTES.chat, {
        method: "POST",
        body: { content, sessionId },
      });
      if (data.session) onSession?.(data.session, isCurrentView());
      settle(data.reply ?? { content: fallbackReply });
    } catch (error) {
      settle({ content: errorMessage(error) });
    } finally {
      setPendingCount((n) => n - 1);
    }
  }

  return { messages, setMessages, sending: pendingCount > 0, send };
}
