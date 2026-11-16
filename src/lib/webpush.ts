import webpush from "web-push";
import { db } from "./db";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BMwuCMhra9xTQ_pcq3hkKa58eZxzHwnHOdURjF4FO_bUJgduWH7VS5Y2GKrbRW-KA8kn2WM7HpwADnuwqTICEPM";
const privateKey = process.env.VAPID_PRIVATE_KEY || "4viDOlN20UhFNqesgiqTfsjkuMo39fd_2ytb4awZNGg";
const subject = process.env.VAPID_SUBJECT || "mailto:lilstar1712@gmail.com";

try {
  webpush.setVapidDetails(subject, publicKey, privateKey);
} catch (e) {
  console.error("[WebPush] Failed to set VAPID details:", e);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    [key: string]: any;
  };
}

/**
 * Send a web push notification to a specific user across all their registered devices
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const payloadString = JSON.stringify({
      title: payload.title || "Little Star Nhắc Nhở ⭐",
      body: payload.body,
      icon: payload.icon || "/chatbot-star.png",
      badge: payload.badge || "/chatbot-star.png",
      data: payload.data || { url: "/dashboard" },
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, payloadString);
      } catch (err: any) {
        // If status is 404 or 410, the subscription has expired or unsubscribed
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[WebPush] Removing expired subscription ${sub.id}`);
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`[WebPush] Error sending push to sub ${sub.id}:`, err);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error("[WebPush] Failed to send push to user:", error);
  }
}
