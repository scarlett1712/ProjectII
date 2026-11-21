import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { DeviceNotificationStatus } from "@/shared/ui/layout/DeviceNotificationStatus";
import { useDeviceNotifications } from "@/shared/ui/layout/hooks/useDeviceNotifications";
import { useNotificationLog } from "@/shared/ui/layout/hooks/useNotificationLog";
import { useClickOutside } from "@/shared/client/hooks";

interface NotificationBellProps {
  deviceNotifications: ReturnType<typeof useDeviceNotifications>;
}

export function NotificationBell({ deviceNotifications }: NotificationBellProps) {
  const tShell = useTranslations("shell");
  const { notifications, markAsRead, markAllAsRead, clearAll: clearAllNotifs } = useNotificationLog();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  useClickOutside(notifRef, () => setShowNotifDropdown(false), showNotifDropdown);
  return (
    <div ref={notifRef} className="relative shrink-0">
      <button
        onClick={() => setShowNotifDropdown(!showNotifDropdown)}
        aria-label={tShell("notifications.aria")}
        className="relative rounded-full bg-white p-2 text-gray-500 shadow-sm hover:text-primary border border-purple-100 hover:bg-primary-soft transition-all cursor-pointer"
      >
        <Bell className="h-4.5 w-4.5" />
        {notifications.filter(n => !n.read).length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-4xs font-bold text-white">
            {notifications.filter(n => !n.read).length}
          </span>
        )}
      </button>
      <AnimatePresence>
        {showNotifDropdown && (
          <>
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-3rem)] max-w-xs sm:w-80 overflow-hidden rounded-3xl border border-purple-100 bg-white/95 p-4 shadow-2xl backdrop-blur-md z-[200]">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                <p className="text-sm font-black text-gray-800">{tShell("notifications.title")}</p>
                <div className="flex gap-2">
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-2xs font-bold text-primary hover:underline"
                    >
                      {tShell("notifications.markAllRead")}
                    </button>
                  )}
                  <button
                    onClick={clearAllNotifs}
                    className="text-2xs font-bold text-red-500 hover:underline"
                  >
                    {tShell("notifications.clearAll")}
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-thin">
                {notifications.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">{tShell("notifications.empty")}</p>
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
                        <span className="text-caption font-black text-primary">
                          {n.title}
                        </span>
                        <span className="text-3xs text-gray-400 shrink-0 mt-0.5">{n.timestamp}</span>
                      </div>
                      <p className="text-xs font-bold mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              <DeviceNotificationStatus {...deviceNotifications} />
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
