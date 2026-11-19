import { NextRequest, NextResponse } from "next/server";
import { processReminders } from "@/lib/reminderRunner";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  // Verify Cron authorization if CRON_SECRET is set
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  try {
    const result = await processReminders();
    return NextResponse.json({
      success: true,
      processed: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Cron Reminders] Error executing reminder runner:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
