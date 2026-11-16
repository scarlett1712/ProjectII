"use client";

// Helper function to convert VAPID public key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Display a native system notification.
 * Works on Mobile (Android/iOS) via ServiceWorkerRegistration.showNotification,
 * and falls back to desktop new Notification().
 */
export async function showSystemNotification(
  title: string,
  options?: NotificationOptions & { vibrate?: number[] }
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const defaultOptions: NotificationOptions & { vibrate?: number[] } = {
    icon: "/chatbot-star.png",
    badge: "/chatbot-star.png",
    vibrate: [100, 50, 100],
    ...options,
  };

  // 1. Try Service Worker first (Required on Android Chrome and iOS Safari PWA)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, defaultOptions);
        return;
      }
    } catch (err) {
      console.warn("[Notifications] ServiceWorker showNotification failed, attempting fallback:", err);
    }
  }

  // 2. Desktop Browser fallback
  try {
    new Notification(title, defaultOptions);
  } catch (err) {
    console.error("[Notifications] Native Notification constructor failed:", err);
  }
}

/**
 * Register PushManager subscription with server for true background Web Push
 */
export async function registerPushSubscription(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return false;

    // Get current subscription or subscribe new
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      // Get public VAPID key
      const keyRes = await fetch("/api/web-push/subscription");
      if (!keyRes.ok) return false;
      const { publicKey } = await keyRes.json();
      if (!publicKey) return false;

      const convertedKey = urlBase64ToUint8Array(publicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    if (sub) {
      // Send subscription to server
      const subJson = sub.toJSON();
      await fetch("/api/web-push/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subJson),
      });
      return true;
    }
  } catch (err) {
    console.error("[WebPush] Failed to register push subscription:", err);
  }

  return false;
}
