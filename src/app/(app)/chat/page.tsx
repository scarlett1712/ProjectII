"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit2, 
  Send, 
  Search, 
  Check, 
  X, 
  Sparkles 
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type Session = {
  id: string;
  title: string;
  updatedAt: string;
};

type Message = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
};

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // UI states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  
  // Editing states
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState("");
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load initial sessions & messages
  async function loadData(targetSessionId?: string) {
    try {
      const url = targetSessionId ? `/api/chat?sessionId=${targetSessionId}` : "/api/chat";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setCurrentSession(data.session || null);
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Create new session
  const handleNewSession = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newSession: true }),
      });
      if (res.ok) {
        const data = await res.json();
        await loadData(data.session.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa cuộc trò chuyện này không?")) return;
    try {
      const res = await fetch(`/api/chat?sessionId=${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (currentSession?.id === sessionId) {
          await loadData();
        } else {
          setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Bulk delete sessions
  const handleBulkDeleteSessions = async () => {
    if (selectedSessionIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedSessionIds.length} cuộc trò chuyện đã chọn không?`)) return;
    
    try {
      const res = await fetch(`/api/chat?sessionId=${selectedSessionIds.join(",")}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const isActiveSessionDeleted = selectedSessionIds.includes(currentSession?.id || "");
        
        setSessions((prev) => prev.filter((s) => !selectedSessionIds.includes(s.id)));
        setSelectedSessionIds([]);
        setIsMultiSelectMode(false);

        if (isActiveSessionDeleted) {
          await loadData();
        }
      }
    } catch (e) {
      console.error("Failed to bulk delete sessions:", e);
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
      const res = await fetch("/api/chat", {
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

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading || typing) return;
    setInputMessage("");
    setTyping(true);

    const userMessage: Message = {
      id: Math.random().toString(),
      role: "USER",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          sessionId: currentSession?.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.reply]);
        // Update session list to bring active to top
        if (data.session) {
          setSessions((prev) => {
            const filtered = prev.filter((s) => s.id !== data.session.id);
            return [data.session, ...filtered];
          });
          setCurrentSession(data.session);
        }
      } else {
        throw new Error();
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "ASSISTANT",
          content: "Hình như kết nối gặp lỗi rồi bạn iu ơi... Cậu thử gửi lại giúp Star nha! 🥺💖",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setTyping(false);
    }
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
  if (currentSession && currentSession.id === "new" && !displaySessions.some((s) => s.id === "new")) {
    displaySessions.unshift(currentSession);
  }

  const filteredSessions = displaySessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Suggestions chips
  const suggestionChips = [
    { text: "💧 Ghi nhận uống 250ml nước", query: "Mình mới uống 250ml nước nè" },
    { text: "🍛 Ăn phở bò", query: "Hôm nay mình ăn phở bò" },
    { text: "🌟 Tính lại mục tiêu sức khỏe", query: "Hãy tính lại mục tiêu sức khỏe dựa trên hồ sơ của mình nha" },
    { text: "📝 Thêm việc cần làm", query: "Thêm việc cần làm: Tập thể dục chiều nay" },
  ];

  return (
    <div className="flex h-[80vh] overflow-hidden rounded-[32px] bg-white/60 shadow-xl border border-white/20 backdrop-blur-xl">
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
            <button
              onClick={handleNewSession}
              disabled={loading || isMultiSelectMode}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-[#A172FD] py-3 text-xs font-black text-white hover:bg-[#8b5cf6] transition-all duration-300 shadow-md shadow-purple-200 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Thêm chat
            </button>
            <button
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                setSelectedSessionIds([]);
              }}
              className={`px-3 py-3 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                isMultiSelectMode
                  ? "bg-purple-100 border-purple-300 text-purple-700 font-black"
                  : "bg-white border-purple-100 text-purple-600 hover:bg-purple-50"
              }`}
            >
              Quản lý
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl bg-white px-9 py-2 text-xs text-purple-950 placeholder:text-gray-400 font-bold outline-none focus:ring-2 focus:ring-[#A172FD]/20 border border-purple-100"
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
                  className="h-4 w-4 rounded border-purple-200 text-[#A172FD] focus:ring-[#A172FD]/30 cursor-pointer accent-[#A172FD]"
                />
                Chọn tất cả
              </label>
              <button
                onClick={handleBulkDeleteSessions}
                disabled={selectedSessionIds.length === 0}
                className="px-2.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-extrabold text-[10px] disabled:opacity-40 transition-colors cursor-pointer"
              >
                Xóa ({selectedSessionIds.length})
              </button>
            </div>
          )}
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
          {filteredSessions.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8 font-medium">Không có cuộc trò chuyện nào</p>
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
                      ? "bg-purple-50/70 border-purple-200 text-[#581C87]"
                      : "bg-white/40 border-transparent hover:bg-white/90 text-gray-700 hover:border-purple-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {isMultiSelectMode ? (
                      <input
                        type="checkbox"
                        checked={selectedSessionIds.includes(session.id)}
                        onChange={() => {}} // Click is handled row-level by handleSelectSession
                        className="h-4.5 w-4.5 rounded border-purple-200 text-[#A172FD] focus:ring-[#A172FD]/30 shrink-0 cursor-pointer accent-[#A172FD]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <MessageSquare className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-[#A172FD]" : "text-gray-400"}`} />
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
                        <span className="text-[9px] text-gray-400 font-bold mt-0.5">
                          {format(new Date(session.updatedAt), "HH:mm, dd/MM", { locale: vi })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Sidebar options */}
                  {!isEditing && !isMultiSelectMode && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-white via-white pl-4 py-1.5 pr-0.5">
                      <button
                        onClick={(e) => startRenameSession(session, e)}
                        className="p-1 rounded-lg hover:bg-purple-100 text-purple-600 cursor-pointer"
                        title="Đổi tên"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-1 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* CHAT WINDOW */}
      <div className="flex-1 flex flex-col bg-[#F5F3FF]/15 h-full overflow-hidden relative">
        {/* Toggle sidebar button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute left-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#A172FD] border border-purple-100 shadow-md hover:bg-purple-50 transition-all cursor-pointer"
        >
          {isSidebarCollapsed ? <ChevronRight className="h-4.5 w-4.5" /> : <ChevronLeft className="h-4.5 w-4.5" />}
        </button>

        {/* Header */}
        <header className="h-16 shrink-0 flex items-center justify-between border-b border-purple-100/50 bg-white/40 px-16 z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-[#A172FD] shadow-sm">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex flex-col text-left">
              <h2 className="text-sm font-black text-gray-800">
                {currentSession?.title || "Trợ lý ảo Star"}
              </h2>
              <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
                Đang trực tuyến nè~
              </span>
            </div>
          </div>
        </header>

        {/* Messages threads */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin bg-gradient-to-b from-transparent to-[#F5F3FF]/30">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
              <div className="h-20 w-20 rounded-full bg-purple-100 flex items-center justify-center animate-bounce shadow-inner">
                <span className="text-4xl">⭐</span>
              </div>
              <h3 className="text-base font-black text-[#581C87]">Bé Sao hóng cậu iu nha!</h3>
              <p className="text-xs text-gray-500 font-bold leading-relaxed">
                Hôm nay bạn iu muốn ghi nhận nước uống, bữa ăn hay đơn giản là trò chuyện linh tinh cùng Star nè? Hỏi gì Star cũng trả lời hết á! 🥰💖
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "USER";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-3`}>
                  {!isUser && (
                    <div className="h-9 w-9 shrink-0 rounded-full border border-purple-200 bg-white flex items-center justify-center text-lg shadow-sm">
                      ⭐
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : "items-start"} space-y-1`}>
                    <span className="text-[9px] font-black text-[#A172FD] opacity-75 px-1.5">
                      {isUser ? "Bạn iu" : "Bé Sao ⭐"}
                    </span>
                    <div
                      className={`rounded-3xl px-5 py-3.5 text-sm shadow-sm leading-relaxed whitespace-pre-wrap text-left ${
                        isUser
                          ? "bg-[#6D28D9] text-white font-black rounded-tr-none"
                          : "bg-white text-gray-800 rounded-tl-none border border-purple-100 font-medium"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[8px] text-gray-400 font-bold px-1.5">
                      {format(new Date(msg.createdAt), "HH:mm")}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing status */}
          {typing && (
            <div className="flex justify-start items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full border border-purple-200 bg-white flex items-center justify-center text-lg shadow-sm">
                ⭐
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-[9px] font-black text-[#A172FD] opacity-75 px-1.5">Bé Sao ⭐</span>
                <div className="rounded-3xl rounded-tl-none border border-purple-100 bg-white px-5 py-3 shadow-sm">
                  <div className="flex gap-1 py-1">
                    <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Chips and Input Container */}
        <div className="p-4 border-t border-purple-100/50 bg-white/40 space-y-4 shrink-0">
          {/* Suggestion Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none justify-start px-2">
            {suggestionChips.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(chip.query)}
                className="shrink-0 bg-white hover:bg-purple-50 text-purple-700 border border-purple-100 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-300 active:scale-95 shadow-sm cursor-pointer"
              >
                {chip.text}
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
              placeholder="Gửi tin nhắn hoặc nhờ Bé Sao ghi chép sức khỏe..."
              className="flex-1 rounded-2xl bg-white px-5 py-3.5 text-sm text-purple-950 placeholder:text-gray-400 font-bold outline-none focus:ring-2 focus:ring-[#A172FD]/20 border border-purple-100 shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading || typing}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A172FD] text-white transition-all shadow-md cursor-pointer ${
                inputMessage.trim() && !loading && !typing
                  ? "hover:bg-[#8b5cf6] shadow-purple-200 active:scale-95"
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
