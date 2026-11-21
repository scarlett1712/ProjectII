"use client";

import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { hasActivePushSubscription, showSystemNotification, syncRemindersWithServer } from "@/shared/client/clientNotifications";
import { dueWaterSlots, type WaterLogLike, type WaterSlotLike } from "./dueWaterSlots";
import { API_ROUTES } from "@/shared/config/routes";
import { emitStarNotification } from "@/shared/client/appEvents";
import { STORAGE_KEYS } from "@/shared/client/storageKeys";

/** Reminder polling interval. */
const POLL_INTERVAL_MS = 30000;

/**
 * While signed in, ask the server every 30 seconds to push due reminders. Also check upcoming tasks,
 * events and water slots locally to display device notifications and emit star-notification events.
 * The user requests notification permission through the enable button. Store delivered slots in localStorage
 * to avoid repeating reminders.
 */
export function useReminderPolling(userId: string | null) {
  const tShell = useTranslations("shell");
  const tc = useTranslations("common");

  const notifiedCache = useRef<Record<string, Record<string, boolean>>>({});
  const notifiedWaterCache = useRef<Set<string>>(new Set());

  // Load notified caches from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedNotified = localStorage.getItem(STORAGE_KEYS.notifiedReminders);
    if (savedNotified) {
      try {
        notifiedCache.current = JSON.parse(savedNotified);
      } catch (e) {
        console.error(e);
      }
    }
    const savedWater = localStorage.getItem(STORAGE_KEYS.notifiedWaterSlots);
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
    if (!userId) return;

    const checkNotifications = async () => {
      try {
        const now = new Date();

        // Request Web Push for due reminders. Server-side delivery markers prevent duplicates.
        void syncRemindersWithServer();
        // With Web Push enabled, the server delivers water and deadline reminders to this device. Skip duplicate
        // system notifications while still updating the bell and showing the reminder through the mascot.
        const serverPushes = await hasActivePushSubscription();

        // 1. Check Tasks and Calendar Events
        const [calRes, taskRes] = await Promise.all([
          fetch(API_ROUTES.calendar),
          fetch(API_ROUTES.tasks)
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
                  localStorage.setItem(STORAGE_KEYS.notifiedReminders, JSON.stringify(notifiedCache.current));
                }

                const message = item.isTask
                  ? tShell("reminder.task", { title: item.title, threshold: threshold })
                  : tShell("reminder.event", { title: item.title, threshold: threshold });

                if (!(serverPushes && threshold === "overdue")) {
                  showSystemNotification(tc("app.reminderTitle"), { body: message });
                }

                emitStarNotification({ message, type: "task", id: item.id });
              }
            }
          }
        }

        // 2. Check Water Reminder Slots (Strictly use phone local time, ignore server UTC offset)
        const waterRes = await fetch(API_ROUTES.water);
        if (waterRes.ok) {
          const waterData = (await waterRes.json()) as { slots?: WaterSlotLike[]; logs?: WaterLogLike[] };
          // Use the actual local time on the user's phone or computer.
          const localTodayStr = format(now, "yyyy-MM-dd");

          for (const slot of dueWaterSlots(waterData.slots ?? [], waterData.logs ?? [], now)) {
            const cacheKey = `water_${slot.id}_${localTodayStr}_${slot.slotTime}`;
            if (notifiedWaterCache.current.has(cacheKey)) continue;

            // Mark the reminder in memory immediately and persist it in localStorage for the day.
            notifiedWaterCache.current.add(cacheKey);
            try {
              localStorage.setItem(STORAGE_KEYS.notifiedWaterSlots, JSON.stringify(Array.from(notifiedWaterCache.current)));
            } catch {}

            const message = tShell("reminder.water", { slotTime: slot.slotTime, amountMl: String(slot.amountMl) });
            if (!serverPushes) showSystemNotification(tShell("notifications.reminderTitleWithStar"), { body: message });
            emitStarNotification({ message, type: "water", amountMl: slot.amountMl, slotId: slot.id });
          }
        }
      } catch (err) {
        console.error("Error checking notifications:", err);
      }
    };

    // Initial check
    checkNotifications();

    // Check every 30 seconds
    const interval = setInterval(checkNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // Depend on the user ID. The session object changes when the tab regains focus and would restart polling.
  }, [userId, tShell, tc]);
}
