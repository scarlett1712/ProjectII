import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json({ error: "Năm và tháng không hợp lệ" }, { status: 400 });
    }

    const goals = await db.budgetGoal.findMany({
      where: {
        userId: auth.userId!,
        year,
        month,
      },
    });
    return NextResponse.json(goals);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { categoryId, amount, year, month } = body;

    if (!categoryId || amount === undefined || isNaN(year) || isNaN(month)) {
      return NextResponse.json({ error: "Thiếu dữ liệu mục tiêu ngân sách" }, { status: 400 });
    }

    const goal = await db.budgetGoal.upsert({
      where: {
        userId_categoryId_year_month: {
          userId: auth.userId!,
          categoryId,
          year,
          month,
        },
      },
      update: {
        amount: Number(amount),
      },
      create: {
        userId: auth.userId!,
        categoryId,
        amount: Number(amount),
        year: Number(year),
        month: Number(month),
      },
    });
    return NextResponse.json(goal);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
