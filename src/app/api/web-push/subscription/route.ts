import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";
import { getVapidPublicKey } from "@/lib/webpush";

export async function GET() {
  const publicKey = getVapidPublicKey();
  return NextResponse.json({ publicKey });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUserId(req);
    if (auth.response) return auth.response;
    const userId = auth.userId;

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
    }

    const sub = await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, subscriptionId: sub.id });
  } catch (error: any) {
    console.error("[API WebPush] Error registering subscription:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireUserId(req);
    if (auth.response) return auth.response;
    const userId = auth.userId;

    const body = await req.json();
    const { endpoint } = body;

    if (endpoint) {
      await db.pushSubscription.deleteMany({
        where: {
          userId,
          endpoint,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API WebPush] Error deleting subscription:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
