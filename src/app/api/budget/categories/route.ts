import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";
import { TransactionType } from "@prisma/client";

export async function GET() {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const categories = await db.budgetCategory.findMany({
      where: { userId: auth.userId! },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(categories);
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
    const { name, type, color } = body;
    if (!name || !type) {
      return NextResponse.json({ error: "Thiếu tên danh mục hoặc phân loại" }, { status: 400 });
    }

    if (type !== "INCOME" && type !== "EXPENSE") {
      return NextResponse.json({ error: "Phân loại không hợp lệ" }, { status: 400 });
    }

    // Check if category name already exists for this user and type
    const existing = await db.budgetCategory.findFirst({
      where: {
        userId: auth.userId!,
        name: String(name).trim(),
        type: type as TransactionType,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Danh mục này đã tồn tại" }, { status: 400 });
    }

    const category = await db.budgetCategory.create({
      data: {
        userId: auth.userId!,
        name: String(name).trim(),
        type: type as TransactionType,
        color: color ? String(color).trim() : "#A172FD",
      },
    });
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { id, name, color } = body;
    if (!id || !name) {
      return NextResponse.json({ error: "Thiếu ID hoặc tên danh mục" }, { status: 400 });
    }

    // Check if category name already exists (excluding current id)
    const existing = await db.budgetCategory.findFirst({
      where: {
        userId: auth.userId!,
        name: String(name).trim(),
        id: { not: id },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Danh mục trùng tên đã tồn tại" }, { status: 400 });
    }

    await db.budgetCategory.update({
      where: { id, userId: auth.userId! },
      data: {
        name: String(name).trim(),
        color: color ? String(color).trim() : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    await db.budgetCategory.deleteMany({
      where: { id, userId: auth.userId! },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
