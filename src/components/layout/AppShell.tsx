"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Wallet, 
  MessageSquare, 
  LogOut,
  User as UserIcon,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StarBackground } from "@/components/StarBackground";
import { DraggableStar } from "@/components/DraggableStar";
import { format } from "date-fns";

const sidebarLinks = [
  { href: "/dashboard", label: "Trang chủ", icon: LayoutDashboard },
  { href: "/nutrition", label: "Măm măm", icon: UtensilsCrossed },
  { href: "/calendar", label: "Lịch lịch", icon: Calendar },
  { href: "/budget", label: "Xèng xèng", icon: Wallet },
  { href: "/chat", label: "Chat chat", icon: MessageSquare },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, update: updateSession } = useSession();
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Sidebar state
  const [isCollapsed, setIsCollapsed] = useState(false);

  type NotificationLog = {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
  };
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("star-notification-logs");
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Listen to global events
  useEffect(() => {
    const handleNotificationEvent = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const { message, type } = customEvent.detail;
      const newNotif: NotificationLog = {
        id: Math.random().toString(36).substring(2, 9),
        title: type === "water" ? "Nhắc nhở uống nước 💧" : "Nhắc nhở công việc ⭐",
        message,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        read: false,
      };
      setNotifications((prev) => {
        const updated = [newNotif, ...prev].slice(0, 50);
        localStorage.setItem("star-notification-logs", JSON.stringify(updated));
        return updated;
      });
    };

    window.addEventListener("star-notification", handleNotificationEvent);
    return () => window.removeEventListener("star-notification", handleNotificationEvent);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem("star-notification-logs", JSON.stringify(updated));
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem("star-notification-logs", JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllNotifs = () => {
    setNotifications([]);
    localStorage.removeItem("star-notification-logs");
  };

  // Edit profile states
  const [editName, setEditName] = useState("");
  const [editGender, setEditGender] = useState("MALE");
  const [editAge, setEditAge] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editActivity, setEditActivity] = useState("SEDENTARY");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Global search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowResults(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: "ASSISTANT", content: "Xin chào! Mình là Star. Hôm nay bạn thế nào?" }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (session) {
      fetch("/api/profile")
        .then(res => res.json())
        .then(data => setProfile(data))
        .catch(() => undefined);

      // Reset chatbot session when re-entering the app (mounting AppShell)
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true })
      })
        .then(res => res.json())
        .then(() => {
          setChatMessages([
            { role: "ASSISTANT", content: "Xin chào! Mình là Star. Hôm nay bạn thế nào?" }
          ]);
        })
        .catch(() => undefined);
    }
  }, [session]);

  useEffect(() => {
    if (profile) {
      setEditName(session?.user?.name || "");
      setEditGender(profile.gender || "MALE");
      setEditAge(profile.age ? String(profile.age) : "");
      setEditWeight(profile.weightKg ? String(profile.weightKg) : "");
      setEditHeight(profile.heightCm ? String(profile.heightCm) : "");
      setEditActivity(profile.activityLevel || "SEDENTARY");
    }
  }, [profile, session]);

  const notifiedCache = useRef<Record<string, Record<string, boolean>>>({});
  const notifiedWaterCache = useRef<Set<string>>(new Set());

  // Load notified caches from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedNotified = localStorage.getItem("star-notified-cache");
    if (savedNotified) {
      try {
        notifiedCache.current = JSON.parse(savedNotified);
      } catch (e) {
        console.error(e);
      }
    }
    const savedWater = localStorage.getItem("star-notified-water-cache");
    if (savedWater) {
      try {
        const arr = JSON.parse(savedWater);
        notifiedWaterCache.current = new Set(arr);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    // Request notification permission
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const checkNotifications = async () => {
      try {
        const now = new Date();
        const todayStr = format(now, "yyyy-MM-dd");
        const nowStr = format(now, "HH:mm");

        // 1. Check Tasks and Calendar Events
        const [calRes, taskRes] = await Promise.all([
          fetch("/api/calendar"),
          fetch("/api/tasks")
        ]);

        if (calRes.ok && taskRes.ok) {
          const events = await calRes.json();
          const tasks = await taskRes.json();
          const combined = [
            ...events.map((e: any) => ({ ...e, isTask: false })),
            ...tasks.map((t: any) => ({ ...t, isTask: true, startAt: t.dueAt }))
          ];

          for (const item of combined) {
            if (!item.notification || !item.startAt) continue;

            const diffMs = new Date(item.startAt).getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            // Determine if we match any threshold
            let threshold: "warning" | "critical" | "overdue" | null = null;
            if (diffHours <= 0 && diffHours > -1 && !item.completed) {
              threshold = "overdue";
            } else if (diffHours <= 2 && diffHours > 0 && !item.completed) {
              threshold = "critical";
            } else if (diffHours <= 24 && diffHours > 23.5 && !item.completed) {
              threshold = "warning";
            }

            if (threshold) {
              const itemCache = notifiedCache.current[item.id] || {};
              if (!itemCache[threshold]) {
                if (!notifiedCache.current[item.id]) notifiedCache.current[item.id] = {};
                notifiedCache.current[item.id][threshold] = true;
                if (typeof window !== "undefined") {
                  localStorage.setItem("star-notified-cache", JSON.stringify(notifiedCache.current));
                }

                const message = item.isTask 
                  ? `Nhiệm vụ "${item.title}" ${threshold === 'overdue' ? 'đã đến hạn!' : threshold === 'critical' ? 'sắp hết hạn (còn dưới 2 giờ)!' : 'sắp hết hạn (còn dưới 24 giờ)!'}`
                  : `Sự kiện "${item.title}" ${threshold === 'overdue' ? 'đang diễn ra!' : threshold === 'critical' ? 'sắp diễn ra (còn dưới 2 giờ)!' : 'sắp diễn ra (còn dưới 24 giờ)!'}`;

                if (Notification.permission === "granted") {
                  try {
                    new Notification("Little Star Nhắc Nhở", { body: message, icon: "/chatbot-star.png" });
                  } catch (e) {
                    console.error("Standard notification error, fallback to service worker if any", e);
                  }
                }

                window.dispatchEvent(new CustomEvent("star-notification", {
                  detail: { message, type: "task", id: item.id }
                }));
              }
            }
          }
        }

        // 2. Check Water Reminder Slots
        const waterRes = await fetch("/api/water");
        if (waterRes.ok) {
          const waterData = await waterRes.json();
          const slots = waterData.slots || [];
          for (const slot of slots) {
            if (slot.slotTime === nowStr) {
              const cacheKey = `${slot.id}-${todayStr}`;
              if (!notifiedWaterCache.current.has(cacheKey)) {
                notifiedWaterCache.current.add(cacheKey);
                if (typeof window !== "undefined") {
                  localStorage.setItem("star-notified-water-cache", JSON.stringify(Array.from(notifiedWaterCache.current)));
                }

                const message = `Đã đến giờ uống nước! Hãy uống ${slot.amountMl}ml nước nhé. 💧`;
                
                if (Notification.permission === "granted") {
                  try {
                    new Notification("Little Star Nhắc Nhở", { body: message, icon: "/chatbot-star.png" });
                  } catch (e) {
                    console.error("Standard notification error, fallback to service worker if any", e);
                  }
                }

                window.dispatchEvent(new CustomEvent("star-notification", {
                  detail: { message, type: "water", amountMl: slot.amountMl, slotId: slot.id }
                }));
              }
            }
          }
        }
      } catch (err) {
        console.error("Error checking notifications:", err);
      }
    };

    // Initial check
    checkNotifications();

    // Check every 30 seconds
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatOpen]);

  const getActivityLabel = (level: string) => {
    const map: any = {
      SEDENTARY: "Ít vận động",
      LIGHT: "Vận động nhẹ",
      MODERATE: "Vận động vừa",
      ACTIVE: "Vận động nhiều",
      VERY_ACTIVE: "Vận động rất nhiều"
    };
    return map[level] || level;
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const content = chatInput.trim();
    const userMsg = { role: "USER", content };
    setChatMessages(prev => [...prev, userMsg, { role: "ASSISTANT", content: "Đang kết nối với AI..." }]);
    setChatInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages(prev => {
          const newMsgs = [...prev];
          newMsgs.pop(); // remove loading message
          return [...newMsgs, data.reply];
        });
      }
    } catch (e) {
      setChatMessages(prev => {
        const newMsgs = [...prev];
        newMsgs.pop();
        return [...newMsgs, { role: "ASSISTANT", content: "Lỗi kết nối. Vui lòng thử lại!" }];
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          gender: editGender,
          age: editAge ? Number(editAge) : null,
          weightKg: editWeight ? Number(editWeight) : null,
          heightCm: editHeight ? Number(editHeight) : null,
          activityLevel: editActivity
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setIsEditingProfile(false);
        if (updateSession) {
          await updateSession();
        }
        // Reload to sync user session name
        window.location.reload();
      }
    } catch (err) {
      console.error("Error saving profile:", err);
    }
  };

  return (
    <StarBackground>
      <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
        {/* Main Inner Frame */}
        <div className="relative flex h-[90vh] w-full max-w-[1440px] overflow-hidden rounded-[48px] bg-white/80 shadow-[0_20px_80px_rgba(0,0,0,0.15)] backdrop-blur-xl">
          {/* Sidebar */}
          <aside className={`border-r border-white/20 bg-white/40 transition-all duration-300 flex flex-col ${isCollapsed ? "w-24 p-4" : "w-64 p-8"}`}>
            <div className="flex h-full flex-col">
              {/* Logo/Brand */}
              <div className="mb-12 flex items-center justify-between px-2">
                {!isCollapsed && (
                  <h2 className="text-2xl font-black tracking-tight text-[#A172FD] transition-all">Little Star</h2>
                )}
                {isCollapsed && (
                  <h2 className="text-2xl font-black tracking-tight text-[#A172FD] transition-all">⭐</h2>
                )}
                <button 
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="rounded-xl p-1.5 text-[#6B7280] hover:bg-white/60 hover:text-[#A172FD] transition-all"
                  title={isCollapsed ? "Mở rộng" : "Thu gọn"}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronLeft className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-3">
                {sidebarLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`group relative flex items-center gap-4 rounded-2xl py-3.5 text-sm font-bold transition-all ${
                        isCollapsed ? "justify-center px-0" : "px-4"
                      } ${
                        isActive 
                          ? "bg-white text-[#A172FD] shadow-sm" 
                          : "text-[#6B7280] hover:bg-white/50 hover:text-[#A172FD]"
                      }`}
                      title={isCollapsed ? link.label : ""}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-[#A172FD]" : "text-[#9CA3AF] group-hover:text-[#A172FD]"}`} />
                      {!isCollapsed && <span>{link.label}</span>}
                    </Link>
                  );
                })}
              </nav>

              {/* User Profile Bar */}
              <div className="relative mt-auto pt-8">
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-[calc(100%-20px)] left-0 w-full overflow-hidden rounded-3xl border border-white/50 bg-white/90 p-2 shadow-2xl backdrop-blur-md z-[200]"
                    >
                      <button 
                        onClick={() => { setShowProfile(true); setUserMenuOpen(false); }}
                        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-[#4B5563] hover:bg-[#F5F3FF] hover:text-[#A172FD] transition-all"
                      >
                        <UserIcon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span>Hồ sơ</span>}
                      </button>
                      <button 
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span>Đăng xuất</span>}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div 
                  id="tour-user-profile"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex cursor-pointer items-center gap-3 rounded-3xl text-white shadow-lg transition-all active:scale-95 ${
                    isCollapsed ? "justify-center p-3" : "p-4"
                  } ${userMenuOpen ? "bg-[#581C87]" : "bg-[#A172FD] hover:bg-[#8B5CF6]"}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-bold">{session?.user?.name || "Lilstar"}</p>
                      <p className="truncate text-xs opacity-70">Người dùng</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-[#F5F3FF]/30 p-8 transition-all duration-300 flex flex-col">
            <div className={`mx-auto w-full flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? "max-w-7xl" : "max-w-6xl"}`}>
              
              {/* Global Top Header Bar */}
              <header className="flex items-center justify-between mb-8 pb-4 border-b border-purple-100/50">
                <div>
                  <h1 className="text-2xl font-black text-[#581C87] capitalize">
                    {pathname.startsWith("/dashboard") ? "Trang chủ" :
                     pathname.startsWith("/nutrition") ? "Măm măm" :
                     pathname.startsWith("/calendar") ? "Lịch lịch" :
                     pathname.startsWith("/budget") ? "Xèng xèng" :
                     pathname.startsWith("/chat") ? "Star Chat" : "Little Star"}
                  </h1>
                  <p className="text-xs text-gray-500">
                    {pathname.startsWith("/dashboard") ? "Năng lượng bùng nổ nào!!" :
                     pathname.startsWith("/nutrition") ? "Ăn uống điều độ, uống nước đủ đầy" :
                     pathname.startsWith("/calendar") ? "Sắp xếp lịch trình & quản lý công việc" :
                     pathname.startsWith("/budget") ? "Quản lý chi tiêu hợp lý" :
                     pathname.startsWith("/chat") ? "Trò chuyện cùng trợ lý Star" : "Trợ lý sức khỏe của bạn"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Notification permission prompt button */}
                  {typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted" && (
                    <button
                      onClick={async () => {
                        const res = await Notification.requestPermission();
                        if (res === "granted") {
                          try {
                            new Notification("Little Star Nhắc Nhở", {
                              body: "Cảm ơn bạn đã bật thông báo hệ thống! 🌟",
                              icon: "/chatbot-star.png"
                            });
                          } catch (e) {
                            console.error(e);
                          }
                        }
                        window.location.reload();
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-yellow-50 hover:bg-yellow-100 px-3.5 py-1.5 text-[11px] font-black text-yellow-700 transition-all border border-yellow-200 shadow-sm animate-pulse cursor-pointer shrink-0"
                      title="Bật thông báo Windows"
                    >
                      <span>⚠️ Bật thông báo Windows</span>
                    </button>
                  )}

                  {/* Global Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm mọi thứ..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-full bg-white px-10 py-2 text-sm text-purple-950 placeholder:text-gray-400 font-bold shadow-sm outline-none focus:ring-2 focus:ring-[#A172FD]/20 w-64 border border-purple-100"
                    />
                    
                    {/* Search results dropdown */}
                    <AnimatePresence>
                      {showResults && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full right-0 mt-2 w-80 max-h-80 overflow-y-auto bg-white/95 rounded-2xl border border-purple-100 shadow-2xl p-2 z-[200] backdrop-blur-md"
                        >
                          {searchLoading ? (
                            <p className="text-xs text-gray-400 p-3 text-center">Đang tìm kiếm...</p>
                          ) : searchResults.length === 0 ? (
                            <p className="text-xs text-gray-400 p-3 text-center">Không tìm thấy kết quả</p>
                          ) : (
                            <div className="space-y-1">
                              {searchResults.map((res) => (
                                <Link 
                                  key={res.id} 
                                  href={res.href}
                                  onClick={() => { setShowResults(false); setSearchQuery(""); }}
                                  className="block rounded-xl p-2.5 hover:bg-[#F5F3FF] transition-colors border border-transparent hover:border-purple-100 text-left"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-[#A172FD] bg-purple-50 px-2 py-0.5 rounded-full">{res.type}</span>
                                    <span className="text-[9px] text-gray-400">{res.desc}</span>
                                  </div>
                                  <p className="text-sm font-bold text-gray-800 mt-1 truncate">{res.title}</p>
                                </Link>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative">
                    <button 
                      onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                      className="relative rounded-full bg-white p-2 text-gray-500 shadow-sm hover:text-[#A172FD] border border-purple-100 hover:bg-[#F5F3FF] transition-all"
                    >
                      <Bell className="h-4.5 w-4.5" />
                      {notifications.filter(n => !n.read).length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                          {notifications.filter(n => !n.read).length}
                        </span>
                      )}
                    </button>
                    <AnimatePresence>
                      {showNotifDropdown && (
                        <>
                          <div className="fixed inset-0 z-[190]" onClick={() => setShowNotifDropdown(false)} />
                          <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-3xl border border-purple-100 bg-white/95 p-4 shadow-2xl backdrop-blur-md z-[200]">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                              <p className="text-sm font-black text-gray-800">Thông báo</p>
                              <div className="flex gap-2">
                                {notifications.filter(n => !n.read).length > 0 && (
                                  <button 
                                    onClick={markAllAsRead}
                                    className="text-[10px] font-bold text-[#A172FD] hover:underline"
                                  >
                                    Đọc tất cả
                                  </button>
                                )}
                                <button 
                                  onClick={clearAllNotifs}
                                  className="text-[10px] font-bold text-red-500 hover:underline"
                                >
                                  Xóa hết
                                </button>
                              </div>
                            </div>

                            <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-thin">
                              {notifications.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6">Không có thông báo nào</p>
                              ) : (
                                notifications.map((n) => (
                                  <div 
                                    key={n.id} 
                                    onClick={() => markAsRead(n.id)}
                                    className={`p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                                      n.read 
                                        ? "bg-gray-50/50 border-gray-100/50 text-gray-500" 
                                        : "bg-purple-50/30 border-purple-100/50 text-gray-800 hover:bg-purple-50/50"
                                    }`}
                                  >
                                    <div className="flex justify-between items-start gap-2">
                                      <span className="text-[11px] font-black text-[#A172FD]">
                                        {n.title}
                                      </span>
                                      <span className="text-[9px] text-gray-400 shrink-0 mt-0.5">{n.timestamp}</span>
                                    </div>
                                    <p className="text-xs font-bold mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </header>

              <div className="flex-1">
                {children}
              </div>
            </div>
          </main>
        </div>

        {/* Profile Modal */}
        <AnimatePresence>
          {showProfile && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 backdrop-blur-md"
              onClick={() => { setShowProfile(false); setIsEditingProfile(false); }}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-md overflow-hidden rounded-[40px] bg-white p-10 shadow-2xl border border-purple-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#F5F3FF] ring-8 ring-[#F5F3FF]/50">
                    <UserIcon className="h-12 w-12 text-[#A172FD]" />
                  </div>

                  {!isEditingProfile ? (
                    <>
                      <h2 className="mb-1 text-2xl font-bold text-[#A172FD]">{session?.user?.name || "Lilstar"}</h2>
                      <p className="mb-8 text-sm text-[#6B7280]">Thông tin người dùng</p>
                      
                      <div className="w-full space-y-3">
                        <div className="flex items-center justify-between rounded-2xl bg-[#F5F3FF] px-5 py-3">
                          <span className="text-sm font-bold text-[#6B7280]">Giới tính</span>
                          <span className="text-sm font-black text-[#A172FD]">
                            {profile?.gender === "FEMALE" ? "Nữ" : profile?.gender === "MALE" ? "Nam" : profile?.gender === "OTHER" ? "Khác" : "Chưa thiết lập"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-[#F5F3FF] px-5 py-3">
                          <span className="text-sm font-bold text-[#6B7280]">Tuổi</span>
                          <span className="text-sm font-black text-[#A172FD]">{profile?.age ? `${profile.age} tuổi` : "Chưa thiết lập"}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#F5F3FF] p-3">
                            <span className="text-[10px] font-bold text-[#6B7280] uppercase">Cân nặng</span>
                            <span className="text-base font-black text-[#A172FD]">{profile?.weightKg ? `${profile.weightKg} kg` : "Chưa thiết lập"}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center rounded-2xl bg-[#F5F3FF] p-3">
                            <span className="text-[10px] font-bold text-[#6B7280] uppercase">Chiều cao</span>
                            <span className="text-base font-black text-[#A172FD]">{profile?.heightCm ? `${profile.heightCm} cm` : "Chưa thiết lập"}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-[#F5F3FF] px-5 py-3">
                          <span className="text-sm font-bold text-[#6B7280]">Vận động</span>
                          <span className="text-sm font-black text-[#A172FD]">{getActivityLabel(profile?.activityLevel) || "Chưa thiết lập"}</span>
                        </div>
                      </div>

                      <div className="mt-8 flex w-full gap-3">
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="flex-1 rounded-2xl border-2 border-[#A172FD] py-4 font-bold text-[#A172FD] hover:bg-[#F5F3FF] transition-transform active:scale-95"
                        >
                          Chỉnh sửa
                        </button>
                        <button 
                          onClick={() => { setShowProfile(false); setIsEditingProfile(false); }}
                          className="flex-1 rounded-2xl bg-[#A172FD] py-4 font-bold text-white shadow-lg transition-transform active:scale-95 hover:scale-[1.02]"
                        >
                          Đóng
                        </button>
                      </div>
                    </>
                  ) : (
                    <form onSubmit={handleSaveProfile} className="w-full">
                      <h2 className="mb-6 text-xl font-bold text-[#A172FD] text-center">Chỉnh sửa hồ sơ</h2>
                      <div className="space-y-4 max-h-[50vh] overflow-y-auto px-1">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Họ và tên</label>
                          <input 
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm text-gray-900 font-bold placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#A172FD]/20"
                            placeholder="Nhập tên của bạn..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Giới tính</label>
                          <select 
                            value={editGender}
                            onChange={(e) => setEditGender(e.target.value)}
                            className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm text-gray-900 font-bold outline-none focus:ring-2 focus:ring-[#A172FD]/20"
                          >
                            <option value="MALE">Nam</option>
                            <option value="FEMALE">Nữ</option>
                            <option value="OTHER">Khác</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tuổi</label>
                            <input 
                              type="number"
                              value={editAge}
                              onChange={(e) => setEditAge(e.target.value)}
                              className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm text-gray-900 font-bold placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#A172FD]/20"
                              placeholder="Tuổi"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cân nặng (kg)</label>
                            <input 
                              type="number"
                              value={editWeight}
                              onChange={(e) => setEditWeight(e.target.value)}
                              className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm text-gray-900 font-bold placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#A172FD]/20"
                              placeholder="Cân nặng"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chiều cao (cm)</label>
                            <input 
                              type="number"
                              value={editHeight}
                              onChange={(e) => setEditHeight(e.target.value)}
                              className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm text-gray-900 font-bold placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#A172FD]/20"
                              placeholder="Chiều cao"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mức độ vận động</label>
                          <select 
                            value={editActivity}
                            onChange={(e) => setEditActivity(e.target.value)}
                            className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm text-gray-900 font-bold outline-none focus:ring-2 focus:ring-[#A172FD]/20"
                          >
                            <option value="SEDENTARY">Ít vận động (làm việc văn phòng)</option>
                            <option value="LIGHT">Vận động nhẹ (tập thể dục 1-3 ngày/tuần)</option>
                            <option value="MODERATE">Vận động vừa (tập thể dục 3-5 ngày/tuần)</option>
                            <option value="ACTIVE">Vận động nhiều (tập thể dục 6-7 ngày/tuần)</option>
                            <option value="VERY_ACTIVE">Vận động rất nhiều (vận động viên, lao động nặng)</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-8 flex gap-3">
                        <button 
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="flex-1 rounded-2xl border-2 border-gray-300 py-4 font-bold text-gray-500 hover:bg-gray-50 transition-transform active:scale-95"
                        >
                          Hủy
                        </button>
                        <button 
                          type="submit"
                          className="flex-1 rounded-2xl bg-[#A172FD] py-4 font-bold text-white shadow-lg transition-transform active:scale-95 hover:scale-[1.02]"
                        >
                          Lưu
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Draggable Chatbot Star */}
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
                    <span className="text-sm font-black text-[#A172FD]">Star Assistant</span>
                  </div>
                  <button onClick={() => setChatOpen(false)} className="rounded-full p-1 hover:bg-gray-100">
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
                <div className="mb-4 max-h-60 space-y-4 overflow-y-auto rounded-2xl bg-[#F5F3FF]/50 p-4 text-sm scrollbar-thin">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === "USER" ? "items-end" : "items-start"} space-y-1`}>
                      <span className="text-[10px] font-bold text-[#A172FD] opacity-75">
                        {msg.role === "USER" ? "Bạn" : "Bé Sao ⭐"}
                      </span>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm leading-relaxed ${
                        msg.role === "USER" 
                          ? "bg-[#6D28D9] text-white font-bold rounded-tr-none" 
                          : "bg-white text-gray-800 rounded-tl-none border border-purple-50"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendChat} className="relative">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Hỏi Star bất cứ điều gì..."
                    className="w-full rounded-2xl bg-[#F5F3FF] px-4 py-3 text-sm text-purple-950 placeholder:text-purple-400 outline-none focus:ring-2 focus:ring-[#A172FD]/20 font-semibold"
                  />
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </DraggableStar>
      </div>
    </StarBackground>
  );
}
