import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushToUser } from "@/lib/webpush";
import { generateRecurringInstances } from "@/lib/recurrence";

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

  const now = new Date();
  const nowMs = now.getTime();
  const processed = { tasks: 0, events: 0, water: 0 };

  try {
    // 1. Check Due Tasks (Due within -15m to +1m)
    const tasks = await db.taskItem.findMany({
      where: {
        completed: false,
        notification: true,
        dueAt: {
          not: null,
          gte: new Date(nowMs - 15 * 60 * 1000),
          lte: new Date(nowMs + 1 * 60 * 1000),
        },
      },
    });

    for (const task of tasks) {
      if (!task.dueAt) continue;
      await sendPushToUser(task.userId, {
        title: "Nhắc nhở công việc ⭐",
        body: `Đã đến hạn: "${task.title}"`,
        data: { url: "/calendar" },
      }).catch(() => {});
      processed.tasks++;
    }

    // 2. Check Calendar Events
    const startWindow = new Date(nowMs - 15 * 60 * 1000);
    const endWindow = new Date(nowMs + 1 * 60 * 1000);

    const events = await db.calendarEvent.findMany({
      where: { notification: true },
    });

    for (const event of events) {
      const instances = generateRecurringInstances(event, startWindow, endWindow);
      for (const inst of instances) {
        const timeStr = new Date(inst.startAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Ho_Chi_Minh",
        });
        await sendPushToUser(event.userId, {
          title: "Sự kiện sắp diễn ra ⭐",
          body: `Lúc ${timeStr}: "${inst.title}"`,
          data: { url: "/calendar" },
        }).catch(() => {});
        processed.events++;
      }
    }

    // 3. Check Water Reminder Slots (Match Vietnam Time UTC+7)
    const vnFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const currentTimeStr = vnFormatter.format(now);

    const slots = await db.waterReminderSlot.findMany({
      where: {
        enabled: true,
        slotTime: currentTimeStr,
      },
    });

    for (const slot of slots) {
      await sendPushToUser(slot.userId, {
        title: "Nhắc nhở uống nước ⭐",
        body: `Đã đến giờ uống nước: ${slot.amountMl}ml (${slot.slotTime}) 💧`,
        data: { url: "/dashboard" },
      }).catch(() => {});
      processed.water++;
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      currentTimeStr,
      processed,
    });
  } catch (error: any) {
    console.error("[Cron Reminders] Error processing reminders:", error);
    return NextResponse.json({ error: error.message || "Cron execution failed" }, { status: 500 });
  }
}
