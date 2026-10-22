import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";
import { addMonths, addDays, addWeeks } from "date-fns";

// Helper to generate recurring task instances
function generateRecurringTaskInstances(task: any, windowStart: Date, windowEnd: Date) {
  if (!task.recurrence || task.recurrence === "NONE") {
    return [task];
  }

  const instances = [];
  let currentStart = new Date(task.dueAt || task.createdAt);
  const limitDate = task.recurrenceEnd ? new Date(task.recurrenceEnd) : addMonths(new Date(), 6);

  while (currentStart <= limitDate) {
    if (currentStart >= windowStart && currentStart <= windowEnd) {
      instances.push({
        ...task,
        id: `${task.id}_rec_${currentStart.getTime()}`,
        isRecurringInstance: true,
        originalId: task.id,
        dueAt: new Date(currentStart),
        completed: false, // Recurring occurrences generated from template start uncompleted; individual completions are stored as standalone tasks
      });
    }

    if (task.recurrence === "DAILY") {
      currentStart = addDays(currentStart, 1);
    } else if (task.recurrence === "WEEKLY") {
      currentStart = addWeeks(currentStart, 1);
    } else if (task.recurrence === "MONTHLY") {
      currentStart = addMonths(currentStart, 1);
    } else {
      break;
    }
  }
  return instances;
}

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    const windowStart = startParam ? new Date(startParam) : addMonths(new Date(), -3);
    const windowEnd = endParam ? new Date(endParam) : addMonths(new Date(), 6);

    const tasks = await db.taskItem.findMany({
      where: { userId: auth.userId! },
      orderBy: { createdAt: "desc" },
    });

    const allInstances = tasks.flatMap((task: any) =>
      generateRecurringTaskInstances(task, windowStart, windowEnd)
    );

    return NextResponse.json(allInstances);
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
        tagId: body.tagId ? body.tagId : null,
        color: body.color ?? null,
        notification: Boolean(body.notification),
        noteColor: body.noteColor ?? null,
        recurrence: body.recurrence ?? null,
        recurrenceEnd: body.recurrenceEnd ? new Date(body.recurrenceEnd) : null,
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

    const { searchParams } = new URL(req.url);
    const originalId = id.includes("_rec_") ? id.split("_rec_")[0] : id;

    const task = await db.taskItem.findFirst({
      where: {
        id: originalId,
        userId: auth.userId!
      }
    });

    if (!task) {
      return NextResponse.json({ error: "Không tìm thấy nhiệm vụ gốc." }, { status: 404 });
    }

    const isRecurring = Boolean(id.includes("_rec_") || (task.recurrence && task.recurrence !== "NONE"));

    let mode = searchParams.get("mode") || body.mode;
    if (!mode) {
      if (id.includes("_rec_")) {
        mode = "one";
      } else if (data.completed !== undefined && isRecurring) {
        mode = "one";
      } else {
        mode = "all";
      }
    }

    // Mode: "one" - editing or completing a single instance of a recurring series
    if (mode === "one" && isRecurring) {
      let timestamp: number;

      if (id.includes("_rec_")) {
        const parts = id.split("_rec_");
        timestamp = parseInt(parts[1], 10);
      } else {
        timestamp = task.dueAt ? new Date(task.dueAt).getTime() : new Date(task.createdAt).getTime();
      }

      const instanceStart = new Date(timestamp);
      const taskStart = new Date(task.dueAt || task.createdAt);

      let nextStart = new Date(instanceStart);
      if (task.recurrence === "DAILY") {
        nextStart = addDays(nextStart, 1);
      } else if (task.recurrence === "WEEKLY") {
        nextStart = addWeeks(nextStart, 1);
      } else if (task.recurrence === "MONTHLY") {
        nextStart = addMonths(nextStart, 1);
      }

      if (instanceStart.getTime() === taskStart.getTime()) {
        const limitDate = task.recurrenceEnd ? new Date(task.recurrenceEnd) : null;
        if (limitDate && nextStart > limitDate) {
          await db.taskItem.deleteMany({
            where: { id: originalId, userId: auth.userId! }
          });
        } else {
          await db.taskItem.update({
            where: { id: originalId },
            data: { dueAt: nextStart }
          });
        }
      } else {
        const newEndLimit = new Date(instanceStart.getTime() - 1000);
        await db.taskItem.update({
          where: { id: originalId },
          data: { recurrenceEnd: newEndLimit }
        });

        const originalRecurrenceEnd = task.recurrenceEnd ? new Date(task.recurrenceEnd) : null;
        if (!originalRecurrenceEnd || nextStart <= originalRecurrenceEnd) {
          await db.taskItem.create({
            data: {
              userId: auth.userId!,
              title: task.title,
              description: task.description,
              dueAt: nextStart,
              tagId: task.tagId,
              color: task.color,
              notification: task.notification,
              noteColor: task.noteColor,
              recurrence: task.recurrence,
              recurrenceEnd: task.recurrenceEnd
            }
          });
        }
      }

      const newDueAt = data.dueAt !== undefined ? (data.dueAt ? new Date(data.dueAt) : null) : (task.dueAt ? instanceStart : null);
      const standaloneTask = await db.taskItem.create({
        data: {
          userId: auth.userId!,
          title: data.title !== undefined ? data.title : task.title,
          description: data.description !== undefined ? data.description : task.description,
          dueAt: newDueAt,
          completed: data.completed !== undefined ? Boolean(data.completed) : false,
          tagId: data.tagId !== undefined ? (data.tagId ? data.tagId : null) : task.tagId,
          color: data.color !== undefined ? data.color : task.color,
          notification: data.notification !== undefined ? Boolean(data.notification) : task.notification,
          noteColor: data.noteColor !== undefined ? data.noteColor : task.noteColor,
          recurrence: "NONE",
          recurrenceEnd: null
        }
      });
      return NextResponse.json(standaloneTask);
    }

    // Mode: "future" - modifying from this instance forward
    if (mode === "future" && isRecurring) {
      let timestamp: number;
      if (id.includes("_rec_")) {
        const parts = id.split("_rec_");
        timestamp = parseInt(parts[1], 10);
      } else {
        timestamp = task.dueAt ? new Date(task.dueAt).getTime() : new Date(task.createdAt).getTime();
      }
      const instanceStart = new Date(timestamp);
      const taskStart = new Date(task.dueAt || task.createdAt);

      if (instanceStart.getTime() === taskStart.getTime()) {
        const updatedParent = await db.taskItem.update({
          where: { id: originalId },
          data: {
            title: data.title !== undefined ? data.title : task.title,
            description: data.description !== undefined ? data.description : task.description,
            dueAt: data.dueAt ? new Date(data.dueAt) : task.dueAt,
            tagId: data.tagId !== undefined ? (data.tagId ? data.tagId : null) : task.tagId,
            color: data.color !== undefined ? data.color : task.color,
            notification: data.notification !== undefined ? Boolean(data.notification) : task.notification,
            noteColor: data.noteColor !== undefined ? data.noteColor : task.noteColor,
            recurrence: data.recurrence !== undefined ? data.recurrence : task.recurrence,
            recurrenceEnd: data.recurrenceEnd !== undefined ? (data.recurrenceEnd ? new Date(data.recurrenceEnd) : null) : task.recurrenceEnd
          }
        });
        return NextResponse.json(updatedParent);
      } else {
        const newEndLimit = new Date(instanceStart.getTime() - 1000);
        await db.taskItem.update({
          where: { id: originalId },
          data: { recurrenceEnd: newEndLimit }
        });

        const newStartAt = data.dueAt ? new Date(data.dueAt) : instanceStart;
        const newSeries = await db.taskItem.create({
          data: {
            userId: auth.userId!,
            title: data.title !== undefined ? data.title : task.title,
            description: data.description !== undefined ? data.description : task.description,
            dueAt: newStartAt,
            tagId: data.tagId !== undefined ? (data.tagId ? data.tagId : null) : task.tagId,
            color: data.color !== undefined ? data.color : task.color,
            notification: data.notification !== undefined ? Boolean(data.notification) : task.notification,
            noteColor: data.noteColor !== undefined ? data.noteColor : task.noteColor,
            recurrence: data.recurrence !== undefined ? data.recurrence : task.recurrence,
            recurrenceEnd: data.recurrenceEnd !== undefined ? (data.recurrenceEnd ? new Date(data.recurrenceEnd) : null) : task.recurrenceEnd
          }
        });
        return NextResponse.json(newSeries);
      }
    }

    // Default / mode === "all": update entire task / series
    const targetId = id.includes("_rec_") ? id.split("_rec_")[0] : id;
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueAt !== undefined) updateData.dueAt = data.dueAt ? new Date(data.dueAt) : null;
    if (data.completed !== undefined) updateData.completed = Boolean(data.completed);
    if (data.tagId !== undefined) updateData.tagId = data.tagId ? data.tagId : null;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.notification !== undefined) updateData.notification = Boolean(data.notification);
    if (data.noteColor !== undefined) updateData.noteColor = data.noteColor;
    if (data.recurrence !== undefined) updateData.recurrence = data.recurrence;
    if (data.recurrenceEnd !== undefined) updateData.recurrenceEnd = data.recurrenceEnd ? new Date(data.recurrenceEnd) : null;

    await db.taskItem.updateMany({
      where: { id: targetId, userId: auth.userId! },
      data: updateData,
    });

    const updatedTask = await db.taskItem.findFirst({
      where: { id: targetId, userId: auth.userId! }
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
    const mode = searchParams.get("mode") || "all";

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID nhiệm vụ." }, { status: 400 });
    }

    if (id.includes("_rec_")) {
      const parts = id.split("_rec_");
      const originalId = parts[0];
      const timestamp = parseInt(parts[1], 10);
      const instanceStart = new Date(timestamp);

      const task = await db.taskItem.findFirst({
        where: { id: originalId, userId: auth.userId! }
      });

      if (!task) {
        return NextResponse.json({ error: "Không tìm thấy nhiệm vụ gốc." }, { status: 404 });
      }

      const taskStart = new Date(task.dueAt || task.createdAt);

      if (mode === "one") {
        let nextStart = new Date(instanceStart);
        if (task.recurrence === "DAILY") nextStart = addDays(nextStart, 1);
        else if (task.recurrence === "WEEKLY") nextStart = addWeeks(nextStart, 1);
        else if (task.recurrence === "MONTHLY") nextStart = addMonths(nextStart, 1);

        if (instanceStart.getTime() === taskStart.getTime()) {
          const limitDate = task.recurrenceEnd ? new Date(task.recurrenceEnd) : null;
          if (limitDate && nextStart > limitDate) {
            await db.taskItem.deleteMany({
              where: { id: originalId, userId: auth.userId! }
            });
          } else {
            await db.taskItem.update({
              where: { id: originalId },
              data: { dueAt: nextStart }
            });
          }
        } else {
          const newEndLimit = new Date(instanceStart.getTime() - 1000);
          await db.taskItem.update({
            where: { id: originalId },
            data: { recurrenceEnd: newEndLimit }
          });

          const originalRecurrenceEnd = task.recurrenceEnd ? new Date(task.recurrenceEnd) : addMonths(new Date(), 6);
          if (nextStart <= originalRecurrenceEnd) {
            await db.taskItem.create({
              data: {
                userId: auth.userId!,
                title: task.title,
                description: task.description,
                dueAt: nextStart,
                tagId: task.tagId,
                color: task.color,
                notification: task.notification,
                noteColor: task.noteColor,
                recurrence: task.recurrence,
                recurrenceEnd: task.recurrenceEnd
              }
            });
          }
        }
        return NextResponse.json({ ok: true });
      }

      if (mode === "future") {
        if (instanceStart.getTime() === taskStart.getTime()) {
          await db.taskItem.deleteMany({
            where: { id: originalId, userId: auth.userId! }
          });
        } else {
          const newEndLimit = new Date(instanceStart.getTime() - 1000);
          await db.taskItem.update({
            where: { id: originalId },
            data: { recurrenceEnd: newEndLimit }
          });
        }
        return NextResponse.json({ ok: true });
      }

      // mode === "all"
      await db.taskItem.deleteMany({
        where: { id: originalId, userId: auth.userId! }
      });
      return NextResponse.json({ ok: true });
    }

    // Standard non-recurring delete
    await db.taskItem.deleteMany({
      where: { id, userId: auth.userId! },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi xóa nhiệm vụ." }, { status: 500 });
  }
}
