import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";
import { calculateDailyCalories, type ActivityLevel } from "@/lib/health/calorie";

export async function GET() {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const profile = await db.profile.findUnique({ where: { userId: auth.userId! } });
  return NextResponse.json(profile);
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const body = await req.json();

  if (body.name) {
    await db.user.update({
      where: { id: auth.userId! },
      data: { name: String(body.name).trim() },
    });
  }

  const weight = (body.weightKg !== undefined && body.weightKg !== null && body.weightKg !== "") ? Number(body.weightKg) : NaN;
  const height = (body.heightCm !== undefined && body.heightCm !== null && body.heightCm !== "") ? Number(body.heightCm) : NaN;
  const age = (body.age !== undefined && body.age !== null && body.age !== "") ? Number(body.age) : NaN;

  const dailyCalories = calculateDailyCalories({
    gender: body.gender,
    weightKg: isNaN(weight) ? 0 : weight,
    heightCm: isNaN(height) ? 0 : height,
    age: isNaN(age) ? 0 : age,
    activityLevel: body.activityLevel as ActivityLevel,
  });

  const profile = await db.profile.upsert({
    where: { userId: auth.userId! },
    create: {
      userId: auth.userId!,
      gender: body.gender || null,
      weightKg: isNaN(weight) ? null : weight,
      heightCm: isNaN(height) ? null : height,
      age: isNaN(age) ? null : age,
      activityLevel: body.activityLevel || null,
      dailyCalories: isNaN(dailyCalories) ? null : dailyCalories,
    },
    update: {
      gender: body.gender || null,
      weightKg: isNaN(weight) ? null : weight,
      heightCm: isNaN(height) ? null : height,
      age: isNaN(age) ? null : age,
      activityLevel: body.activityLevel || null,
      dailyCalories: isNaN(dailyCalories) ? null : dailyCalories,
    },
  });

  if (!isNaN(weight) && weight > 0) {
    const dailyTargetMl = Math.round(weight * 35);
    await db.waterGoal.updateMany({
      where: { userId: auth.userId!, active: true },
      data: { active: false },
    });
    await db.waterGoal.create({
      data: { userId: auth.userId!, dailyTargetMl },
    });

    await db.waterReminderSlot.deleteMany({ where: { userId: auth.userId! } });
    const startHour = 8;
    const endHour = 22;
    const slotsCount = Math.max(1, endHour - startHour + 1);
    const perSlot = Math.round(dailyTargetMl / slotsCount);
    const slotData = Array.from({ length: slotsCount }, (_, idx) => ({
      userId: auth.userId!,
      slotTime: `${String(startHour + idx).padStart(2, "0")}:00`,
      amountMl: perSlot,
    }));
    await db.waterReminderSlot.createMany({ data: slotData });
  }

  return NextResponse.json(profile);
}
