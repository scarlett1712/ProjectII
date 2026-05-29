import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";

const SYSTEM_TAGS = [
  { id: "system-event", name: "Lịch cố định", color: "#A172FD", isSystem: true },
  { id: "system-task", name: "Task", color: "#fdfd96", isSystem: true },
];

export async function GET() {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const userTags = await db.calendarTag.findMany({
      where: { userId: auth.userId! },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json([...SYSTEM_TAGS, ...userTags]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi lấy nhãn." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { name, color } = body;

    if (!name || !color) {
      return NextResponse.json({ error: "Thiếu tên hoặc màu sắc của nhãn." }, { status: 400 });
    }

    const tag = await db.calendarTag.create({
      data: {
        userId: auth.userId!,
        name: String(name).trim(),
        color: String(color).trim(),
        isSystem: false,
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi tạo nhãn." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { id, name, color } = body;

    if (!id || !name || !color) {
      return NextResponse.json({ error: "Thiếu thông tin nhãn." }, { status: 400 });
    }

    // System tags are handled via localStorage overrides on the client
    if (id.startsWith("system-")) {
      return NextResponse.json({ error: "Nhãn hệ thống không thể sửa qua API." }, { status: 400 });
    }

    await db.calendarTag.updateMany({
      where: { id, userId: auth.userId! },
      data: { name: String(name).trim(), color: String(color).trim() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi cập nhật nhãn." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID nhãn." }, { status: 400 });
    }

    // Verify it is not a system tag
    if (id.startsWith("system-")) {
      return NextResponse.json({ error: "Không thể xóa nhãn hệ thống." }, { status: 400 });
    }

    await db.calendarTag.deleteMany({
      where: { id, userId: auth.userId! },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi xóa nhãn." }, { status: 500 });
  }
}
