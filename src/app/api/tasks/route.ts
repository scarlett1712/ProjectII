import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";

export async function GET() {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const tasks = await db.taskItem.findMany({
      where: { userId: auth.userId! },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi lấy danh sách nhiệm vụ." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const task = await db.taskItem.create({
      data: {
        userId: auth.userId!,
        title: body.title,
        description: body.description ?? null,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        tagId: body.tagId ?? null,
        color: body.color ?? null,
        notification: Boolean(body.notification),
        noteColor: body.noteColor ?? null,
      },
    });
    return NextResponse.json(task);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi tạo nhiệm vụ." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID nhiệm vụ." }, { status: 400 });
    }

    // Prepare update data dynamically based on request body
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueAt !== undefined) updateData.dueAt = data.dueAt ? new Date(data.dueAt) : null;
    if (data.completed !== undefined) updateData.completed = Boolean(data.completed);
    if (data.tagId !== undefined) updateData.tagId = data.tagId;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.notification !== undefined) updateData.notification = Boolean(data.notification);
    if (data.noteColor !== undefined) updateData.noteColor = data.noteColor;

    await db.taskItem.updateMany({
      where: { id, userId: auth.userId! },
      data: updateData,
    });

    const updatedTask = await db.taskItem.findFirst({
      where: { id, userId: auth.userId! }
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi cập nhật nhiệm vụ." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID nhiệm vụ." }, { status: 400 });
    }

    await db.taskItem.deleteMany({
      where: { id, userId: auth.userId! },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi xóa nhiệm vụ." }, { status: 500 });
  }
}
