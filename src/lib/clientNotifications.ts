"use client";

// Helper function to convert VAPID public key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Ensure Service Worker is registered without hanging indefinitely
 */
export async function ensureServiceWorkerRegistered(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }

    // Wait for SW to be ready with a 5s safety timeout
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 5000)
    );

    const activeReg = await Promise.race([readyPromise, timeoutPromise]);
    return activeReg || reg;
  } catch (err) {
    console.error("[Notifications] Service Worker registration failed:", err);
    return null;
  }
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
    vibrate: [150, 50, 150],
    ...options,
  };

  // 1. Try Service Worker first (Required on Android Chrome and iOS Safari PWA)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await ensureServiceWorkerRegistered();
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
    console.warn("[Notifications] Native Notification constructor failed:", err);
  }
}

/**
 * Register PushManager subscription with server for true background Web Push on Mobile & Desktop
 */
export async function registerPushSubscription(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  try {
    const reg = await ensureServiceWorkerRegistered();
    if (!reg || !reg.pushManager) {
      console.warn("[WebPush] PushManager not available in service worker registration");
      return false;
    }

    // 1. Fetch server's current public VAPID key
    const keyRes = await fetch("/api/web-push/subscription");
    if (!keyRes.ok) {
      console.error("[WebPush] Failed to fetch VAPID public key:", keyRes.statusText);
      return false;
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      console.error("[WebPush] Server returned empty VAPID public key");
      return false;
    }

    const convertedKey = urlBase64ToUint8Array(publicKey);

    // 2. Check current browser subscription
    let sub = await reg.pushManager.getSubscription();

    // Check if existing subscription key matches server's current key
    if (sub) {
      const currentKey = sub.options.applicationServerKey;
      let keysMatch = false;
      if (currentKey) {
        const currentBytes = new Uint8Array(currentKey);
        keysMatch =
          currentBytes.length === convertedKey.length &&
          currentBytes.every((val, i) => val === convertedKey[i]);
      }

      if (!keysMatch) {
        console.log("[WebPush] Outdated VAPID key detected. Re-subscribing...");
        try {
          await sub.unsubscribe();
        } catch {}
        sub = null;
      }
    }

    // 3. Create fresh subscription if needed
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource,
      });
    }

    if (sub) {
      // 4. Send subscription to server
      const subJson = sub.toJSON();
      const saveRes = await fetch("/api/web-push/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subJson),
      });

      if (!saveRes.ok) {
        console.error("[WebPush] Server rejected subscription registration:", saveRes.status);
        return false;
      }

      console.log("[WebPush] Push subscription successfully registered with server!");
      return true;
    }
  } catch (err) {
    console.error("[WebPush] Failed to register push subscription:", err);
  }

  return false;
}

/**
 * Trigger an immediate test push notification from the server to this device
 */
export async function sendTestPushNotification(): Promise<{
  success: boolean;
  message: string;
}> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return {
      success: false,
      message: "Trình duyệt này không hỗ trợ thông báo hệ thống.",
    };
  }

  // 1. Request permission if not already granted
  if (Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      return {
        success: false,
        message: "Bạn chưa cấp quyền nhận thông báo. Vui lòng cho phép thông báo trong cài đặt trình duyệt / điện thoại.",
      };
    }
  }

  // 2. Ensure device is registered
  const registered = await registerPushSubscription();
  if (!registered) {
    // Show local fallback notification if web push subscription failed
    await showSystemNotification("Little Star Thông Báo Thử ⭐", {
      body: "Thông báo cục bộ hoạt động tốt! (Lưu ý: Để nhận khi đóng app, cần mạng hỗ trợ Web Push)",
    });
    return {
      success: true,
      message: "Đã hiển thị thông báo thử nghiệm trực tiếp trên màn hình!",
    };
  }

  // 3. Request server to send push
  try {
    const res = await fetch("/api/web-push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Little Star Test Push ⭐",
        message: "Yay! Thông báo đẩy nền trên điện thoại đã hoạt động hoàn hảo! 🚀🌟",
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || "Đã gửi thông báo thử nghiệm thành công! Hãy kiểm tra thanh thông báo điện thoại.",
      };
    } else {
      return {
        success: false,
        message: data.error || "Gửi thông báo thử nghiệm thất bại.",
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi kết nối tới máy chủ: ${err?.message || err}`,
    };
  }
}

/**
 * Sync and trigger any pending reminders on the server for the current user
 */
export async function syncRemindersWithServer() {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/web-push/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Silent catch on background sync
  }
}
