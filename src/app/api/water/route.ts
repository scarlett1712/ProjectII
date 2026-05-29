import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";

function buildSlots(targetMl: number, startHour = 8, endHour = 22) {
  const slots = Math.max(1, endHour - startHour + 1);
  const perSlot = Math.round(targetMl / slots);
  return Array.from({ length: slots }, (_, idx) => ({
    slotTime: `${String(startHour + idx).padStart(2, "0")}:00`,
    amountMl: perSlot,
  }));
}

export async function GET() {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const [goal, logs, slots] = await Promise.all([
    db.waterGoal.findFirst({
      where: { userId: auth.userId!, active: true },
      orderBy: { createdAt: "desc" },
    }),
    db.waterLog.findMany({
      where: { userId: auth.userId! },
      orderBy: { loggedAt: "desc" },
      take: 50,
    }),
    db.waterReminderSlot.findMany({
      where: { userId: auth.userId! },
      orderBy: { slotTime: "asc" },
    }),
  ]);
  return NextResponse.json({ goal, logs, slots });
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const body = await req.json();
  if (body.type === "goal") {
    await db.waterGoal.updateMany({
      where: { userId: auth.userId!, active: true },
      data: { active: false },
    });
    const dailyTargetMl = Number(body.dailyTargetMl);
    const goal = await db.waterGoal.create({
      data: { userId: auth.userId!, dailyTargetMl },
    });
    await db.waterReminderSlot.deleteMany({ where: { userId: auth.userId! } });
    
    let slotData: { slotTime: string; amountMl: number }[] = [];
    if (Array.isArray(body.slots) && body.slots.length > 0) {
      const perSlot = Math.round(dailyTargetMl / body.slots.length);
      slotData = body.slots.map((time: string) => ({
        slotTime: time,
        amountMl: perSlot,
      }));
    } else {
      slotData = buildSlots(dailyTargetMl);
    }
    
    await db.waterReminderSlot.createMany({
      data: slotData.map((s) => ({
        userId: auth.userId!,
        ...s,
      })),
    });
    return NextResponse.json(goal);
  }
  const log = await db.waterLog.create({
    data: {
      userId: auth.userId!,
      amountMl: Number(body.amountMl),
      loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
    },
  });
  return NextResponse.json(log);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "log";
  
  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  if (type === "slot") {
    await db.waterReminderSlot.deleteMany({
      where: { id, userId: auth.userId! },
    });
  } else {
    await db.waterLog.deleteMany({
      where: { id, userId: auth.userId! },
    });
  }

  return NextResponse.json({ ok: true });
}

