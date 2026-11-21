"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useLocalStorageState } from "@/shared/client/hooks";
import { formatTime } from "@/shared/i18n/format";
import { onStarNotification } from "@/shared/client/appEvents";
import { STORAGE_KEYS } from "@/shared/client/storageKeys";

export type NotificationLog = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
};

const MAX_LOGS = 50;

/** Notification bell history subscribes to star-notification and stores up to 50 entries in localStorage. */
export function useNotificationLog() {
  const tShell = useTranslations("shell");
  const [notifications, setNotifications] = useLocalStorageState<NotificationLog[]>(STORAGE_KEYS.notificationLog, []);

  useEffect(() => {
    return onStarNotification(({ message, type }) => {
      // Record only water and task reminders. Other events on this channel, such as meal-estimate after a meal is logged,
      // belong to the mascot's chat and should not appear as task reminders in the bell.
      if (type !== "water" && type !== "task") return;
      const newNotif: NotificationLog = {
        id: Math.random().toString(36).substring(2, 9),
        title: type === "water" ? tShell("notifications.waterTitle") : tShell("notifications.taskTitle"),
        message,
        timestamp: formatTime(new Date()),
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, MAX_LOGS));
    });
  }, [tShell, setNotifications]);

  const markAsRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAllAsRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const clearAll = () => setNotifications([]);

  return { notifications, markAsRead, markAllAsRead, clearAll };
}
