import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";

export async function GET() {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const meals = await db.mealEntry.findMany({
    where: { userId: auth.userId! },
    orderBy: { eatenAt: "desc" },
    take: 50,
  });
  return NextResponse.json(meals);
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const body = await req.json();
  const meal = await db.mealEntry.create({
    data: {
      userId: auth.userId!,
      mealName: body.mealName,
      grams: Number(body.grams),
      calories: Number(body.calories),
      eatenAt: body.eatenAt ? new Date(body.eatenAt) : new Date(),
      note: body.note ?? null,
    },
  });
  return NextResponse.json(meal);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing meal ID" }, { status: 400 });
  }
  await db.mealEntry.deleteMany({
    where: { id, userId: auth.userId! },
  });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const { id, mealName, grams, calories, eatenAt, note } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing meal ID" }, { status: 400 });
    }
    const meal = await db.mealEntry.update({
      where: { id, userId: auth.userId! },
      data: {
        mealName: mealName !== undefined ? String(mealName).trim() : undefined,
        grams: grams !== undefined ? Number(grams) : undefined,
        calories: calories !== undefined ? Number(calories) : undefined,
        eatenAt: eatenAt ? new Date(eatenAt) : undefined,
        note: note !== undefined ? note : undefined,
      },
    });
    return NextResponse.json(meal);
  } catch (error) {
    console.error("PATCH meal error:", error);
    return NextResponse.json({ error: "Failed to update meal" }, { status: 500 });
  }
}


