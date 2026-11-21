"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/shared/ui/components";
import { DraggableStar } from "@/shared/ui/mascot/DraggableStar";
import { ApiError } from "@/shared/client/api";
import { ChatBubble, useChatSend } from "@/shared/ui/chat";

interface AuthMascotChatProps {
  greeting: string;
  placeholder: string;
}

/** Drag the star mascot on authentication screens or click it to open quick chat. */
export function AuthMascotChat({ greeting, placeholder }: AuthMascotChatProps) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  // Guests have no session. The server returns a predefined help response.
  const { messages, sending, send } = useChatSend({
    initialMessages: () => [{ id: "greeting", role: "ASSISTANT", content: greeting }],
    fallbackReply: t("chat.noReply"),
    errorMessage: (error) =>
      error instanceof ApiError
        ? t("chat.replyFailed", { error: error.message || t("chat.replyFailedHint") })
        : t("chat.networkError"),
  });

  function handleSendChat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = chatInput.trim();
    if (!content || sending) return;
    setChatInput("");
    void send(content);
  }

  return (
    <DraggableStar onClick={() => setChatOpen((v) => !v)}>
      {chatOpen && (
        <div className="w-[300px] rounded-2xl border border-primary-border bg-white/95 p-4 shadow-float backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-primary">{t("chat.title")}</p>
            <Button variant="ghost" size="sm" onClick={() => setChatOpen(false)}>
              {tc("action.close")}
            </Button>
          </div>
          <div className="mb-3 max-h-48 space-y-3 overflow-y-auto rounded-xl bg-primary-soft p-3 text-sm scrollbar-thin">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} role={msg.role} size="sm" sender={msg.role === "USER" ? tc("app.you") : tc("app.mascotName")}>
                {msg.content}
              </ChatBubble>
            ))}
          </div>
          <form onSubmit={handleSendChat}>
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-primary-line bg-white px-3 py-2 text-sm text-purple-950 placeholder:text-purple-400 outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-muted/40 font-semibold"
            />
            <Button
              type="submit"
              size="sm"
              fullWidth
              className="mt-2"
              disabled={!chatInput.trim()}
              loading={sending}
              loadingText={t("chat.sending")}
            >
              {t("chat.send")}
            </Button>
          </form>
        </div>
      )}
    </DraggableStar>
  );
}
