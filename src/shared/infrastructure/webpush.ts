import { setVapidDetails, sendNotification } from "web-push";
import { db } from "./db";
import { ASSETS, ROUTES } from "@/shared/config/routes";

/** Valid VAPID public key: a base64url-encoded uncompressed P-256 point (65 bytes starting with 0x04). */
export function isValidVapidPublicKey(key?: string): boolean {
  if (!key) return false;
  const buf = Buffer.from(key, "base64url");
  return buf.length === 65 && buf[0] === 0x04;
}

/** Valid VAPID private key: 32 bytes encoded as base64url. */
export function isValidVapidPrivateKey(key?: string): boolean {
  if (!key) return false;
  return Buffer.from(key, "base64url").length === 32;
}

/** Validated VAPID public key. An empty value disables client push registration when configuration is missing or invalid. */
export function getVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
  return isValidVapidPublicKey(key) ? key : "";
}

function getVapidPrivateKey(): string {
  const key = process.env.VAPID_PRIVATE_KEY || "";
  return isValidVapidPrivateKey(key) ? key : "";
}

let vapidConfigured = false;

/** Configure VAPID on first use. Return false to skip delivery when valid keys are unavailable. */
function ensureVapidConfig(): boolean {
  if (vapidConfigured) return true;
  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  if (!publicKey || !privateKey) return false;
  try {
    setVapidDetails(process.env.VAPID_SUBJECT || "mailto:support@littlestar.app", publicKey, privateKey);
    vapidConfigured = true;
  } catch (e) {
    console.error("[WebPush] Failed to set VAPID details:", e);
  }
  return vapidConfigured;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  /** Notifications sharing a tag replace one another on the device. Omission gives each delivery its own tag. */
  tag?: string;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
}

/** Result of sending to one user's devices. */
export interface PushResult {
  sent: number;
  failed: number;
  total: number;
  /** Set when a configuration or database failure prevents all deliveries. */
  error?: string;
}

/** Send Web Push to every registered device for the user and remove expired subscriptions on 404 or 410. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushResult> {
  try {
    if (!ensureVapidConfig()) {
      console.warn("[WebPush] VAPID chưa được cấu hình đúng, bỏ qua gửi push.");
      return { sent: 0, failed: 0, total: 0, error: "VAPID not configured" };
    }

    const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return { sent: 0, failed: 0, total: 0 };

    const payloadString = JSON.stringify({
      title: payload.title || "Little Star Nhắc Nhở ⭐",
      body: payload.body,
      icon: payload.icon || ASSETS.mascotIcon,
      badge: payload.badge || ASSETS.mascotIcon,
      tag: payload.tag || `star-${Date.now()}`,
      data: payload.data || { url: ROUTES.dashboard },
    });

    let sent = 0;
    let failed = 0;
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payloadString);
          sent++;
        } catch (err) {
          failed++;
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            console.info(`[WebPush] Removing expired subscription ${sub.id}`);
            await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            console.error(`[WebPush] Error sending push to sub ${sub.id}:`, (err as Error)?.message || err);
          }
        }
      }),
    );
    return { sent, failed, total: subscriptions.length };
  } catch (error) {
    console.error("[WebPush] Failed to send push to user:", error);
    return { sent: 0, failed: 0, total: 0, error: (error as Error)?.message || "Unknown error" };
  }
}
