"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  ensureServiceWorkerRegistered,
  registerPushSubscription,
  syncRemindersWithServer,
} from "@/lib/clientNotifications";

export function ServiceWorkerInit() {
  const { data: session, status } = useSession();
  const registeredRef = useRef(false);

  // 1. Register Service Worker on initial mount
  useEffect(() => {
    ensureServiceWorkerRegistered();
  }, []);

  // 2. Automatically register / refresh push subscription when authenticated & permission granted
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "granted" && !registeredRef.current) {
      registeredRef.current = true;
      registerPushSubscription().catch((err) => {
        console.warn("[SW Init] Background push subscription failed:", err);
      });
      // Initial reminder sync
      syncRemindersWithServer();
    }
  }, [status, session]);

  // 3. Whenever user switches back to the tab or unlocks the phone, sync reminders with server
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncRemindersWithServer();
      }
    };

    const handleFocus = () => {
      syncRemindersWithServer();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
