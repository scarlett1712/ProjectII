import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api";
import { sendPushToUser } from "@/lib/webpush";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUserId(req);
    if (auth.response) return auth.response;
    const userId = auth.userId;

    const body = await req.json().catch(() => ({}));
    await sendPushToUser(userId, {
      title: body.title || "Little Star Test Push ⭐",
      body: body.message || "Thông báo thử nghiệm Web Push hoạt động tuyệt vời! 🎉",
      data: { url: "/dashboard" },
    });

    return NextResponse.json({ success: true, message: "Push notification sent" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
