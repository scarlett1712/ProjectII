import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api";
import { processReminders } from "@/lib/reminderRunner";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUserId(req);
    if (auth.response) return auth.response;
    const userId = auth.userId;

    const result = await processReminders(userId);
    return NextResponse.json({
      success: true,
      processed: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[WebPush Sync] Error syncing reminders for user:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
