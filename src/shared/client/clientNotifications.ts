"use client";

import { API_ROUTES, ASSETS } from "@/shared/config/routes";

/** Maximum wait for a ready service worker before falling back to an existing registration. */
const SW_READY_TIMEOUT_MS = 5000;
const SERVICE_WORKER_URL = "/sw.js";

export type NotificationPermissionState = NotificationPermission | "unsupported";

/** Convert a base64url VAPID key to the Uint8Array expected by PushManager. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function sameBytes(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a) return false;
  const bytes = new Uint8Array(a);
  return bytes.length === b.length && bytes.every((value, i) => value === b[i]);
}

/** Current notification permission, or "unsupported" if the browser lacks the Notification API. */
export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Register the service worker if needed and wait up to five seconds for it to become ready. */
export async function ensureServiceWorkerRegistered(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg =
      (await navigator.serviceWorker.getRegistration()) ??
      (await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" }));
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS));
    return (await Promise.race([navigator.serviceWorker.ready, timeout])) ?? reg;
  } catch (err) {
    console.error("[Notifications] Service Worker registration failed:", err);
    return null;
  }
}

/**
 * Show a system notification through the service worker, as required by Android Chrome and iOS PWAs.
 * Fall back to new Notification() on supported desktop browsers.
 */
export async function showSystemNotification(
  title: string,
  options?: NotificationOptions & { vibrate?: number[] }
) {
  if (getNotificationPermission() !== "granted") return;

  const defaultOptions: NotificationOptions & { vibrate?: number[] } = {
    icon: ASSETS.mascotIcon,
    badge: ASSETS.mascotIcon,
    vibrate: [150, 50, 150],
    ...options,
  };

  const reg = await ensureServiceWorkerRegistered();
  if (reg && "showNotification" in reg) {
    try {
      await reg.showNotification(title, defaultOptions);
      return;
    } catch (err) {
      console.warn("[Notifications] ServiceWorker showNotification failed, attempting fallback:", err);
    }
  }

  try {
    new Notification(title, defaultOptions);
  } catch (err) {
    console.warn("[Notifications] Native Notification constructor failed:", err);
  }
}

/**
 * Register Web Push with the server for delivery while the app is closed. If the server has rotated its
 * VAPID key, unsubscribe the old subscription and register a new one.
 */
export async function registerPushSubscription(): Promise<boolean> {
  if (typeof window === "undefined" || !("PushManager" in window) || getNotificationPermission() !== "granted") {
    return false;
  }

  try {
    const reg = await ensureServiceWorkerRegistered();
    if (!reg?.pushManager) return false;

    const keyRes = await fetch(API_ROUTES.webPush.subscription);
    if (!keyRes.ok) return false;
    const { publicKey } = (await keyRes.json()) as { publicKey?: string };
    if (!publicKey) {
      console.warn("[WebPush] Server chưa cấu hình VAPID public key.");
      return false;
    }
    const serverKey = urlBase64ToUint8Array(publicKey);

    let sub = await reg.pushManager.getSubscription();
    if (sub && !sameBytes(sub.options.applicationServerKey, serverKey)) {
      await sub.unsubscribe().catch(() => false);
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey });

    const saveRes = await fetch(API_ROUTES.webPush.subscription, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    return saveRes.ok;
  } catch (err) {
    console.error("[WebPush] Failed to register push subscription:", err);
    return false;
  }
}

/** Whether this device has a Web Push subscription for server reminders. */
export async function hasActivePushSubscription(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!(await reg?.pushManager?.getSubscription());
  } catch {
    return false;
  }
}

/** Request notification permission, register Web Push if granted and return the resulting permission. */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (getNotificationPermission() === "unsupported") return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission === "granted") await registerPushSubscription();
  return permission;
}

/** Test notification result. The optional message has already been translated by the server. */
export type TestPushOutcome =
  | { status: "unsupported" | "denied" | "localOnly" }
  | { status: "sent" | "failed"; message?: string };

/**
 * Send a test push from the server to this device. If Web Push registration is unavailable,
 * show a local notification (localOnly) so the user can still test notifications.
 */
export async function sendTestPushNotification(localTitle: string, localBody: string): Promise<TestPushOutcome> {
  if (getNotificationPermission() === "unsupported") return { status: "unsupported" };
  if (getNotificationPermission() !== "granted" && (await Notification.requestPermission()) !== "granted") {
    return { status: "denied" };
  }

  if (!(await registerPushSubscription())) {
    await showSystemNotification(localTitle, { body: localBody });
    return { status: "localOnly" };
  }

  try {
    const res = await fetch(API_ROUTES.webPush.test, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    return res.ok ? { status: "sent", message: data.message } : { status: "failed", message: data.error };
  } catch {
    return { status: "failed" };
  }
}

/** Ask the server to send currently due reminders for this user when a minutely cron job is unavailable. */
export async function syncRemindersWithServer(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch(API_ROUTES.webPush.sync, { method: "POST" });
  } catch {
    // Ignore network failures during background sync and retry on a later run.
  }
}
