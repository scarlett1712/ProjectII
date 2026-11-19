import { setVapidDetails, sendNotification } from "web-push";
import { db } from "./db";

const FALLBACK_PUBLIC_KEY = "BMwuCMhra9xTQ_pcq3hkKa58eZxzHwnHOdURjF4FO_bUJgduWH7VS5Y2GKrbRW-KA8kn2WM7HpwADnuwqTICEPM";
const FALLBACK_PRIVATE_KEY = "4viDOlN20UhFNqesgiqTfsjkuMo39fd_2ytb4awZNGg";
const FALLBACK_SUBJECT = "mailto:lilstar1712@gmail.com";

export function isValidVapidPublicKey(key?: string): boolean {
  if (!key) return false;
  try {
    const buf = Buffer.from(key, "base64url");
    return buf.length === 65 && buf[0] === 0x04;
  } catch {
    return false;
  }
}

export function isValidVapidPrivateKey(key?: string): boolean {
  if (!key) return false;
  try {
    const buf = Buffer.from(key, "base64url");
    return buf.length === 32;
  } catch {
    return false;
  }
}

export function getVapidPublicKey(): string {
  const envKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  return isValidVapidPublicKey(envKey) ? envKey : FALLBACK_PUBLIC_KEY;
}

export function getVapidPrivateKey(): string {
  const envKey = process.env.VAPID_PRIVATE_KEY || "";
  return isValidVapidPrivateKey(envKey) ? envKey : FALLBACK_PRIVATE_KEY;
}

const publicKey = getVapidPublicKey();
const privateKey = getVapidPrivateKey();
const subject = process.env.VAPID_SUBJECT || FALLBACK_SUBJECT;

if (publicKey && privateKey) {
  try {
    setVapidDetails(subject, publicKey, privateKey);
  } catch (e) {
    console.error("[WebPush] Failed to set VAPID details:", e);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    [key: string]: any;
  };
}

export interface PushResult {
  sent: number;
  failed: number;
  total: number;
  error?: string;
}

/**
 * Send a web push notification to a specific user across all their registered devices
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushResult> {
  try {
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0, total: 0 };
    }

    const payloadString = JSON.stringify({
      title: payload.title || "Little Star Nhắc Nhở ⭐",
      body: payload.body,
      icon: payload.icon || "/chatbot-star.png",
      badge: payload.badge || "/chatbot-star.png",
      tag: payload.tag || `star-${Date.now()}`,
      data: payload.data || { url: "/dashboard" },
    });

    let sent = 0;
    let failed = 0;

    const sendPromises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await sendNotification(pushConfig, payloadString);
        sent++;
      } catch (err: any) {
        failed++;
        // If status is 404 or 410, the subscription has expired or unsubscribed
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[WebPush] Removing expired subscription ${sub.id}`);
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`[WebPush] Error sending push to sub ${sub.id}:`, err?.message || err);
        }
      }
    });

    await Promise.allSettled(sendPromises);
    return { sent, failed, total: subscriptions.length };
  } catch (error: any) {
    console.error("[WebPush] Failed to send push to user:", error);
    return { sent: 0, failed: 0, total: 0, error: error?.message || "Unknown error" };
  }
}
