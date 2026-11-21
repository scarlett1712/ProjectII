import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DraggableStar } from "@/shared/ui/mascot/DraggableStar";
import { IconButton } from "@/shared/ui/components";
import { API_ROUTES } from "@/shared/config/routes";
import { apiErrorMessage, apiRequest } from "@/shared/client/api";
import { DRAFT_CHAT_SESSION_ID } from "@/shared/config/chat";
import { ChatBubble, useChatSend } from "@/shared/ui/chat";

const GREETING_ID = "greeting";
interface QuickChatProps {
  userId: string | undefined;
}

export function QuickChat({ userId }: QuickChatProps) {
  const tShell = useTranslations("shell");
  const tc = useTranslations("common");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSessionId, setChatSessionId] = useState<string>(DRAFT_CHAT_SESSION_ID);
  const {
    messages: chatMessages,
    setMessages: setChatMessages,
    send: sendChat,
  } = useChatSend({
    initialMessages: () => [{ id: GREETING_ID, role: "ASSISTANT", content: tShell("quickChat.greeting") }],
    sessionId: chatSessionId,
    pendingContent: tShell("quickChat.connecting"),
    fallbackReply: tShell("quickChat.connectionError"),
    errorMessage: (err) => apiErrorMessage(err, tShell("quickChat.connectionError")),
    onSession: (chatSession) => setChatSessionId(chatSession.id),
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (userId) {
      // Start a new quick chat session each time the user enters the app.
      apiRequest<{ session?: { id: string } }>(API_ROUTES.chat, { method: "POST", body: { reset: true } })
        .then((data) => {
          if (data.session) {
            setChatSessionId(data.session.id);
          }
          setChatMessages([{ id: GREETING_ID, role: "ASSISTANT", content: tShell("quickChat.greeting") }]);
        })
        .catch(() => undefined);
    }
  }, [userId, tShell, setChatMessages]);
  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatOpen]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const content = chatInput.trim();
    if (!content) return;
    setChatInput("");
    void sendChat(content);
  };
  return (
    <DraggableStar onClick={() => setChatOpen(!chatOpen)}>
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="w-[320px] rounded-3xl border border-white/50 bg-white/90 p-5 shadow-2xl backdrop-blur-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-sm font-black text-primary">{tShell("quickChat.title")}</span>
              </div>
              <IconButton label={tc("action.close")} onClick={() => setChatOpen(false)}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="mb-4 max-h-60 space-y-4 overflow-y-auto rounded-2xl bg-primary-soft/50 p-4 text-sm scrollbar-thin">
              {chatMessages.map((msg) => (
                <ChatBubble key={msg.id} role={msg.role} sender={msg.role === "USER" ? tc("app.you") : tc("app.mascotName")}>
                  {msg.content}
                </ChatBubble>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendChat} className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={tShell("quickChat.placeholder")}
                className="w-full rounded-2xl bg-primary-soft px-4 py-3 text-sm text-purple-950 placeholder:text-purple-400 outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </DraggableStar>
  );
}
