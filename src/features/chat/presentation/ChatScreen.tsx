"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { motion } from "framer-motion";
import { 
  MessageSquare, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit2, 
  Send, 
  Search, 
  Sparkles 
} from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDate } from "@/shared/i18n/format";
import { Button, IconButton, useConfirm, useToast } from "@/shared/ui/components";
import { apiErrorMessage, apiRequest, isAbortError } from "@/shared/client/api";
import { useLatestRequest, useLatestToken } from "@/shared/client/hooks";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { DRAFT_CHAT_SESSION_ID } from "@/shared/config/chat";
import { ChatBubble, useChatSend, type ChatMessage } from "@/shared/ui/chat";

const SUGGESTION_KEYS = ["water", "pho", "goals", "task"] as const;

type Session = {
  id: string;
  title: string;
  updatedAt: string;
};

export default function ChatScreen() {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const tShell = useTranslations("shell");
  const confirm = useConfirm();
  const toast = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  
  // UI states (Default collapsed on entry for clean full-screen chat)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Editing states
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState("");
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Increment on session changes so late replies from the previous session cannot enter the active thread.
  const viewToken = useLatestToken();
  const nextLoadSignal = useLatestRequest();

  const { messages, setMessages, sending: typing, send } = useChatSend<Session>({
    sessionId: currentSession?.id,
    fallbackReply: t("message.sendError"),
    errorMessage: () => t("message.sendError"),
    onSession: (session, isCurrentView) => {
      // Promote the session to the top. Switch the active session only if the user has stayed in the same view.
      setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
      if (isCurrentView) setCurrentSession(session);
    },
    // Discard the reply from this view if the user switches sessions while waiting.
    trackView: () => {
      const sentInView = viewToken.current();
      return () => viewToken.isLatest(sentInView);
    },
  });

  /** Load the session list and messages for targetSessionId or the most recent session. Accept only the latest load. */
  const loadData = async (targetSessionId?: string) => {
    viewToken.next();
    const signal = nextLoadSignal();
    try {
      const url = targetSessionId ? withQuery(API_ROUTES.chat, { sessionId: targetSessionId }) : API_ROUTES.chat;
      const data = await apiRequest<{ sessions?: Session[]; session?: Session | null; messages?: ChatMessage[] }>(url, { signal });
      setSessions(data.sessions || []);
      setCurrentSession(data.session || null);
      setMessages(data.messages || []);
    } catch (e) {
      if (!isAbortError(e)) toast.error(apiErrorMessage(e, t("message.loadError")));
    }
  };

  // Load on mount. useEffectEvent calls the latest loadData without subscribing to its changing identity.
  const loadOnMount = useEffectEvent(() => loadData());
  useEffect(() => {
    loadOnMount();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Create new session
  const handleNewSession = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ session: Session }>(API_ROUTES.chat, { method: "POST", body: { newSession: true } });
      await loadData(data.session.id);
    } catch (e) {
      toast.error(apiErrorMessage(e, t("message.loadError")));
    } finally {
      setLoading(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await confirm({ message: t("sidebar.confirmDelete"), confirmLabel: tc("action.delete") }))) return;
    try {
      await apiRequest(withQuery(API_ROUTES.chat, { sessionId }), { method: "DELETE" });
      if (currentSession?.id === sessionId) {
        await loadData();
      } else {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, t("sidebar.deleteFailed")));
    }
  };

  // Bulk delete sessions
  const handleBulkDeleteSessions = async () => {
    if (selectedSessionIds.length === 0) return;
    if (
      !(await confirm({
        message: t("sidebar.confirmBulkDelete", { count: String(selectedSessionIds.length) }),
        confirmLabel: tc("action.delete"),
      }))
    )
      return;
    
    try {
      await apiRequest(withQuery(API_ROUTES.chat, { sessionId: selectedSessionIds.join(",") }), { method: "DELETE" });
      const isActiveSessionDeleted = selectedSessionIds.includes(currentSession?.id || "");
      setSessions((prev) => prev.filter((s) => !selectedSessionIds.includes(s.id)));
      setSelectedSessionIds([]);
      setIsMultiSelectMode(false);
      if (isActiveSessionDeleted) await loadData();
    } catch (e) {
      toast.error(apiErrorMessage(e, t("sidebar.deleteFailed")));
    }
  };

  // Start renaming session
  const startRenameSession = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleText(session.title);
  };

  // Save session title
  const handleSaveTitle = async (sessionId: string) => {
    if (!editTitleText.trim()) return;
    try {
      const res = await fetch(API_ROUTES.chat, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, title: editTitleText.trim() }),
      });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: editTitleText.trim() } : s))
        );
        if (currentSession?.id === sessionId) {
          setCurrentSession((prev) => prev ? { ...prev, title: editTitleText.trim() } : null);
        }
        setEditingSessionId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() || loading || typing) return;
    setInputMessage("");
    void send(text);
  };

  const handleSelectSession = (sessionId: string) => {
    if (editingSessionId) return; // ignore if renaming
    if (isMultiSelectMode) {
      setSelectedSessionIds((prev) =>
        prev.includes(sessionId)
          ? prev.filter((id) => id !== sessionId)
          : [...prev, sessionId]
      );
      return;
    }
    loadData(sessionId);
  };

  // Filtering sessions (and inject temporary new session if active and not saved)
  const displaySessions = [...sessions];
  if (currentSession && currentSession.id === DRAFT_CHAT_SESSION_ID && !displaySessions.some((s) => s.id === DRAFT_CHAT_SESSION_ID)) {
    displaySessions.unshift(currentSession);
  }

  const filteredSessions = displaySessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const assistantAvatar = (
    <div className="h-9 w-9 shrink-0 rounded-full border border-purple-200 bg-white flex items-center justify-center text-lg shadow-sm">
      {t("message.avatar")}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-210px)] md:h-[80vh] min-h-[460px] overflow-hidden rounded-4xl bg-white/60 shadow-xl border border-white/20 backdrop-blur-xl">
      {/* SIDEBAR */}
      <motion.div
        animate={{ width: isSidebarCollapsed ? 0 : 280 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className={`relative flex flex-col border-r border-purple-100 bg-white/40 h-full overflow-hidden ${
          isSidebarCollapsed ? "border-r-0" : ""
        }`}
      >
        <div className="p-4 flex flex-col gap-4 border-b border-purple-100/50 bg-white/30">
          <div className="flex gap-2">
            <Button
              onClick={handleNewSession}
              disabled={loading || isMultiSelectMode}
              icon={<Plus className="h-4 w-4" />}
              className="flex-1"
            >
              {t("sidebar.newChat")}
            </Button>
            <Button
              variant={isMultiSelectMode ? "primary" : "secondary"}
              aria-pressed={isMultiSelectMode}
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                setSelectedSessionIds([]);
              }}
            >
              {t("sidebar.manage")}
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
            <input
              type="text"
              placeholder={t("sidebar.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl bg-white px-9 py-2 text-xs text-purple-950 placeholder:text-gray-400 font-bold outline-none focus:ring-2 focus:ring-primary/20 border border-purple-100"
            />
          </div>

          {/* Multi-select Header Control Panel */}
          {isMultiSelectMode && (
            <div className="flex items-center justify-between px-1.5 py-1.5 rounded-xl border border-purple-100 bg-purple-50/30 text-xs font-bold text-purple-950">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filteredSessions.length > 0 && selectedSessionIds.length === filteredSessions.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSessionIds(filteredSessions.map((s) => s.id));
                    } else {
                      setSelectedSessionIds([]);
                    }
                  }}
                  className="h-4 w-4 rounded border-purple-200 text-primary focus:ring-primary/30 cursor-pointer accent-primary"
                />
                {t("sidebar.selectAll")}
              </label>
              <Button
                variant="danger"
                size="sm"
                onClick={handleBulkDeleteSessions}
                disabled={selectedSessionIds.length === 0}
              >
                {t("sidebar.deleteSelected", { count: String(selectedSessionIds.length) })}
              </Button>
            </div>
          )}
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
          {filteredSessions.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8 font-medium">{t("sidebar.empty")}</p>
          ) : (
            filteredSessions.map((session) => {
              const isActive = currentSession?.id === session.id;
              const isEditing = editingSessionId === session.id;

              return (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`group relative flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border transition-all duration-300 ${
                    isActive
                      ? "bg-purple-50/70 border-purple-200 text-primary-ink"
                      : "bg-white/40 border-transparent hover:bg-white/90 text-gray-700 hover:border-purple-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {isMultiSelectMode ? (
                      <input
                        type="checkbox"
                        checked={selectedSessionIds.includes(session.id)}
                        onChange={() => {}} // Click is handled row-level by handleSelectSession
                        className="h-4.5 w-4.5 rounded border-purple-200 text-primary focus:ring-primary/30 shrink-0 cursor-pointer accent-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <MessageSquare className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-primary" : "text-gray-400"}`} />
                    )}
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitleText}
                        onChange={(e) => setEditTitleText(e.target.value)}
                        onBlur={() => handleSaveTitle(session.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveTitle(session.id)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-xs font-bold text-gray-900 bg-white border border-purple-200 rounded-lg px-2 py-0.5 outline-none"
                      />
                    ) : (
                      <div className="flex flex-col text-left min-w-0">
                        <span className="text-xs font-black truncate pr-4">{session.title}</span>
                        <span className="text-3xs text-gray-400 font-bold mt-0.5">
                          {formatDate(new Date(session.updatedAt), "HH:mm, dd/MM")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Sidebar options */}
                  {!isEditing && !isMultiSelectMode && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-white via-white pl-4 py-1.5 pr-0.5">
                      <IconButton label={t("sidebar.rename")} onClick={(e) => startRenameSession(session, e)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton label={tc("action.delete")} onClick={(e) => handleDeleteSession(session.id, e)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* CHAT WINDOW */}
      <div className="flex-1 flex flex-col bg-primary-soft/15 h-full overflow-hidden relative">
        {/* Toggle sidebar button */}
        <IconButton
          label={isSidebarCollapsed ? tShell("sidebar.expand") : tShell("sidebar.collapse")}
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute left-4 top-4 z-20"
        >
          {isSidebarCollapsed ? <ChevronRight className="h-4.5 w-4.5" /> : <ChevronLeft className="h-4.5 w-4.5" />}
        </IconButton>

        {/* Header */}
        <header className="h-16 shrink-0 flex items-center justify-between border-b border-purple-100/50 bg-white/40 px-16 z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-primary shadow-sm">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex flex-col text-left">
              <h2 className="text-sm font-black text-gray-800">
                {currentSession?.title || t("header.defaultTitle")}
              </h2>
              <span className="text-2xs font-bold text-green-500 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
                {t("header.online")}
              </span>
            </div>
          </div>
        </header>

        {/* Messages threads */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin bg-gradient-to-b from-transparent to-primary-soft/30">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
              <div className="h-20 w-20 rounded-full bg-purple-100 flex items-center justify-center animate-bounce shadow-inner">
                <span className="text-4xl">{t("empty.icon")}</span>
              </div>
              <h3 className="text-base font-black text-primary-ink">{t("empty.title")}</h3>
              <p className="text-xs text-gray-500 font-bold leading-relaxed">
                {t("empty.description")}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                role={msg.role}
                size="lg"
                sender={msg.role === "USER" ? t("message.you") : tc("app.mascotName")}
                avatar={assistantAvatar}
                footer={
                  msg.createdAt && (
                    <span className="text-4xs text-gray-400 font-bold px-1.5">
                      {formatDate(new Date(msg.createdAt), "HH:mm")}
                    </span>
                  )
                }
              >
                {msg.content}
              </ChatBubble>
            ))
          )}

          {/* Typing status */}
          {typing && (
            <ChatBubble role="ASSISTANT" size="lg" sender={tc("app.mascotName")} avatar={assistantAvatar}>
              <div className="flex gap-1 py-1">
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </ChatBubble>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Chips and Input Container */}
        <div className="p-4 border-t border-purple-100/50 bg-white/40 space-y-4 shrink-0">
          {/* Suggestion Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none justify-start px-2">
            {SUGGESTION_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => handleSendMessage(t(`suggestions.${key}.query`))}
                className="shrink-0 bg-white hover:bg-purple-50 text-purple-700 border border-purple-100 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-300 active:scale-95 shadow-sm cursor-pointer"
              >
                {t(`suggestions.${key}.text`)}
              </button>
            ))}
          </div>

          {/* Input field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputMessage);
            }}
            className="flex gap-2 items-center"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t("inputPlaceholder")}
              className="flex-1 rounded-2xl bg-white px-5 py-3.5 text-sm text-purple-950 placeholder:text-gray-400 font-bold outline-none focus:ring-2 focus:ring-primary/20 border border-purple-100 shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading || typing}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white transition-all shadow-md cursor-pointer ${
                inputMessage.trim() && !loading && !typing
                  ? "hover:bg-primary-hover shadow-purple-200 active:scale-95"
                  : "opacity-40 cursor-not-allowed"
              }`}
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
