"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import {
  ensureServiceWorkerRegistered,
  getNotificationPermission,
  registerPushSubscription,
  syncRemindersWithServer,
} from "@/shared/client/clientNotifications";

/**
 * Mount once in the root layout and register the service worker when the app opens. For a signed-in user
 * with permission, refresh the Web Push subscription and request due reminders whenever they return to the app.
 * Phones generally cannot wake the app with a minutely cron job.
 */
export function ServiceWorkerInit() {
  const { status } = useSession();
  const pushRegistered = useRef(false);
  const signedIn = status === "authenticated";

  useEffect(() => {
    void ensureServiceWorkerRegistered();
  }, []);

  useEffect(() => {
    if (!signedIn || pushRegistered.current || getNotificationPermission() !== "granted") return;
    pushRegistered.current = true;
    registerPushSubscription().catch(() => undefined);
    void syncRemindersWithServer();
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    const handleVisible = () => {
      if (document.visibilityState === "visible") void syncRemindersWithServer();
    };
    window.addEventListener("focus", handleVisible);
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.removeEventListener("focus", handleVisible);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [signedIn]);

  return null;
}
