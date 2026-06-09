import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";
import { addMonths, addDays, addWeeks } from "date-fns";

// Helper to generate recurring instances
function generateRecurringInstances(event: any, windowStart: Date, windowEnd: Date) {
  if (!event.recurrence || event.recurrence === "NONE") {
    return [event];
  }

  const instances = [];
  let currentStart = new Date(event.startAt);
  let currentEnd = new Date(event.endAt);
  const limitDate = event.recurrenceEnd ? new Date(event.recurrenceEnd) : addMonths(new Date(), 6);
  const durationMs = currentEnd.getTime() - currentStart.getTime();

  while (currentStart <= limitDate) {
    if (currentStart >= windowStart && currentStart <= windowEnd) {
      instances.push({
        ...event,
        id: `${event.id}_rec_${currentStart.getTime()}`,
        isRecurringInstance: true,
        originalId: event.id,
        startAt: new Date(currentStart),
        endAt: new Date(currentStart.getTime() + durationMs),
      });
    }

    if (event.recurrence === "DAILY") {
      currentStart = addDays(currentStart, 1);
    } else if (event.recurrence === "WEEKLY") {
      currentStart = addWeeks(currentStart, 1);
    } else if (event.recurrence === "MONTHLY") {
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

    const events = await db.calendarEvent.findMany({
      where: { userId: auth.userId! },
      orderBy: { startAt: "asc" },
    });

    const allInstances = events.flatMap((event: any) => 
      generateRecurringInstances(event, windowStart, windowEnd)
    );

    return NextResponse.json(allInstances);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi lấy sự kiện lịch." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const event = await db.calendarEvent.create({
      data: {
        userId: auth.userId!,
        title: body.title,
        description: body.description ?? null,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        allDay: Boolean(body.allDay),
        tagId: body.tagId ?? null,
        color: body.color ?? null,
        notification: Boolean(body.notification),
        noteColor: body.noteColor ?? null,
        recurrence: body.recurrence ?? null,
        recurrenceEnd: body.recurrenceEnd ? new Date(body.recurrenceEnd) : null,
      },
    });
    return NextResponse.json(event);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi tạo sự kiện." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID sự kiện." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || body.mode || "all";

    // If updating a single occurrence of a recurring series
    if (mode === "one" && (id.includes("_rec_") || (await db.calendarEvent.findFirst({ where: { id, userId: auth.userId! } }))?.recurrence !== "NONE")) {
      let originalId = id;
      let timestamp: number;

      const event = await db.calendarEvent.findFirst({
        where: {
          id: id.includes("_rec_") ? id.split("_rec_")[0] : id,
          userId: auth.userId!
        }
      });

      if (!event) {
        return NextResponse.json({ error: "Không tìm thấy sự kiện gốc." }, { status: 404 });
      }

      if (id.includes("_rec_")) {
        const parts = id.split("_rec_");
        originalId = parts[0];
        timestamp = parseInt(parts[1], 10);
      } else {
        timestamp = new Date(event.startAt).getTime();
      }

      const instanceStart = new Date(timestamp);
      const eventStart = new Date(event.startAt);
      const eventEnd = new Date(event.endAt);
      const durationMs = eventEnd.getTime() - eventStart.getTime();

      // Calculate next start time based on recurrence frequency
      let nextStart = new Date(instanceStart);
      if (event.recurrence === "DAILY") {
        nextStart = addDays(nextStart, 1);
      } else if (event.recurrence === "WEEKLY") {
        nextStart = addWeeks(nextStart, 1);
      } else if (event.recurrence === "MONTHLY") {
        nextStart = addMonths(nextStart, 1);
      }

      if (instanceStart.getTime() === eventStart.getTime()) {
        // If we are modifying the very first occurrence, simply shift the parent start time!
        const limitDate = event.recurrenceEnd ? new Date(event.recurrenceEnd) : null;
        if (limitDate && nextStart > limitDate) {
          // No occurrences left, delete entirely
          await db.calendarEvent.deleteMany({
            where: { id: originalId, userId: auth.userId! }
          });
        } else {
          await db.calendarEvent.update({
            where: { id: originalId },
            data: {
              startAt: nextStart,
              endAt: new Date(nextStart.getTime() + durationMs)
            }
          });
        }
      } else {
        // Splitting: Set the current event recurrenceEnd to the day before the modified instance.
        const newEndLimit = new Date(instanceStart.getTime() - 1000); // 1 second before
        await db.calendarEvent.update({
          where: { id: originalId },
          data: {
            recurrenceEnd: newEndLimit
          }
        });

        // Check if we should create a new series after the modified instance
        const originalRecurenceEnd = event.recurrenceEnd ? new Date(event.recurrenceEnd) : addMonths(new Date(), 6);
        if (nextStart <= originalRecurenceEnd) {
          await db.calendarEvent.create({
            data: {
              userId: auth.userId!,
              title: event.title,
              description: event.description,
              startAt: nextStart,
              endAt: new Date(nextStart.getTime() + durationMs),
              allDay: event.allDay,
              tagId: event.tagId,
              color: event.color,
              notification: event.notification,
              noteColor: event.noteColor,
              recurrence: event.recurrence,
              recurrenceEnd: event.recurrenceEnd
            }
          });
        }
      }

      // Now create the edited occurrence as a standalone event
      const newStartAt = data.startAt ? new Date(data.startAt) : instanceStart;
      const newEndAt = data.endAt ? new Date(data.endAt) : new Date(instanceStart.getTime() + durationMs);

      const standaloneEvent = await db.calendarEvent.create({
        data: {
          userId: auth.userId!,
          title: data.title !== undefined ? data.title : event.title,
          description: data.description !== undefined ? data.description : event.description,
          startAt: newStartAt,
          endAt: newEndAt,
          allDay: data.allDay !== undefined ? Boolean(data.allDay) : event.allDay,
          tagId: data.tagId !== undefined ? data.tagId : event.tagId,
          color: data.color !== undefined ? data.color : event.color,
          notification: data.notification !== undefined ? Boolean(data.notification) : event.notification,
          noteColor: data.noteColor !== undefined ? data.noteColor : event.noteColor,
          recurrence: "NONE",
          recurrenceEnd: null
        }
      });

      return NextResponse.json(standaloneEvent);
    }

    // If updating from this occurrence onward
    if (mode === "future" && (id.includes("_rec_") || (await db.calendarEvent.findFirst({ where: { id, userId: auth.userId! } }))?.recurrence !== "NONE")) {
      let originalId = id;
      let timestamp: number;

      const event = await db.calendarEvent.findFirst({
        where: {
          id: id.includes("_rec_") ? id.split("_rec_")[0] : id,
          userId: auth.userId!
        }
      });

      if (!event) {
        return NextResponse.json({ error: "Không tìm thấy sự kiện gốc." }, { status: 404 });
      }

      if (id.includes("_rec_")) {
        const parts = id.split("_rec_");
        originalId = parts[0];
        timestamp = parseInt(parts[1], 10);
      } else {
        timestamp = new Date(event.startAt).getTime();
      }

      const instanceStart = new Date(timestamp);
      const eventStart = new Date(event.startAt);
      const eventEnd = new Date(event.endAt);
      const durationMs = eventEnd.getTime() - eventStart.getTime();

      const newStartAt = data.startAt ? new Date(data.startAt) : instanceStart;
      const newEndAt = data.endAt ? new Date(data.endAt) : new Date(instanceStart.getTime() + durationMs);

      if (instanceStart.getTime() === eventStart.getTime()) {
        // If we are modifying from the first instance onward, simply update the parent event directly!
        const updatedParent = await db.calendarEvent.update({
          where: { id: originalId },
          data: {
            title: data.title !== undefined ? data.title : event.title,
            description: data.description !== undefined ? data.description : event.description,
            startAt: newStartAt,
            endAt: newEndAt,
            allDay: data.allDay !== undefined ? Boolean(data.allDay) : event.allDay,
            tagId: data.tagId !== undefined ? data.tagId : event.tagId,
            color: data.color !== undefined ? data.color : event.color,
            notification: data.notification !== undefined ? Boolean(data.notification) : event.notification,
            noteColor: data.noteColor !== undefined ? data.noteColor : event.noteColor,
            recurrence: data.recurrence !== undefined ? data.recurrence : event.recurrence,
            recurrenceEnd: data.recurrenceEnd !== undefined ? (data.recurrenceEnd ? new Date(data.recurrenceEnd) : null) : event.recurrenceEnd
          }
        });
        return NextResponse.json(updatedParent);
      } else {
        // Old series terminates before this instance starts
        const newEndLimit = new Date(instanceStart.getTime() - 1000);
        await db.calendarEvent.update({
          where: { id: originalId },
          data: {
            recurrenceEnd: newEndLimit
          }
        });

        // Spawn a new parent series for future occurrences with updated fields
        const newSeries = await db.calendarEvent.create({
          data: {
            userId: auth.userId!,
            title: data.title !== undefined ? data.title : event.title,
            description: data.description !== undefined ? data.description : event.description,
            startAt: newStartAt,
            endAt: newEndAt,
            allDay: data.allDay !== undefined ? Boolean(data.allDay) : event.allDay,
            tagId: data.tagId !== undefined ? data.tagId : event.tagId,
            color: data.color !== undefined ? data.color : event.color,
            notification: data.notification !== undefined ? Boolean(data.notification) : event.notification,
            noteColor: data.noteColor !== undefined ? data.noteColor : event.noteColor,
            recurrence: data.recurrence !== undefined ? data.recurrence : event.recurrence,
            recurrenceEnd: data.recurrenceEnd !== undefined ? (data.recurrenceEnd ? new Date(data.recurrenceEnd) : null) : event.recurrenceEnd
          }
        });
        return NextResponse.json(newSeries);
      }
    }

    // Default: update entire series/event
    const updatedEvent = await db.calendarEvent.update({
      where: { id, userId: auth.userId! },
      data: {
        title: data.title,
        description: data.description,
        startAt: data.startAt ? new Date(data.startAt) : undefined,
        endAt: data.endAt ? new Date(data.endAt) : undefined,
        allDay: data.allDay !== undefined ? Boolean(data.allDay) : undefined,
        tagId: data.tagId,
        color: data.color,
        notification: data.notification !== undefined ? Boolean(data.notification) : undefined,
        noteColor: data.noteColor,
        recurrence: data.recurrence,
        recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
      },
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi cập nhật sự kiện." }, { status: 500 });
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
      return NextResponse.json({ error: "Thiếu ID sự kiện." }, { status: 400 });
    }

    // Check if the id contains a recurrence instance timestamp (e.g. 'cuid_rec_177...')
    if (id.includes("_rec_")) {
      const parts = id.split("_rec_");
      const originalId = parts[0];
      const timestamp = parseInt(parts[1], 10);

      if (mode === "all") {
        // Delete original event
        await db.calendarEvent.deleteMany({
          where: { id: originalId, userId: auth.userId! },
        });
        return NextResponse.json({ ok: true });
      } else if (mode === "future") {
        // Delete from this instance onward
        const event = await db.calendarEvent.findFirst({
          where: { id: originalId, userId: auth.userId! }
        });
        if (!event) {
          return NextResponse.json({ error: "Không tìm thấy sự kiện gốc." }, { status: 404 });
        }

        const instanceStart = new Date(timestamp);
        const eventStart = new Date(event.startAt);

        if (instanceStart.getTime() === eventStart.getTime()) {
          // Deleting from the first instance onward deletes the whole series
          await db.calendarEvent.deleteMany({
            where: { id: originalId, userId: auth.userId! }
          });
        } else {
          // Set recurrence limit to 1 second before the selected instance
          await db.calendarEvent.update({
            where: { id: originalId },
            data: {
              recurrenceEnd: new Date(instanceStart.getTime() - 1000)
            }
          });
        }
        return NextResponse.json({ ok: true });
      } else {
        // Mode is "one"
        const event = await db.calendarEvent.findFirst({
          where: { id: originalId, userId: auth.userId! }
        });
        if (!event) {
          return NextResponse.json({ error: "Không tìm thấy sự kiện gốc." }, { status: 404 });
        }

        const instanceStart = new Date(timestamp);
        const eventStart = new Date(event.startAt);
        const eventEnd = new Date(event.endAt);
        const durationMs = eventEnd.getTime() - eventStart.getTime();

        // Calculate the next start time based on recurrence frequency
        let nextStart = new Date(instanceStart);
        if (event.recurrence === "DAILY") {
          nextStart = addDays(nextStart, 1);
        } else if (event.recurrence === "WEEKLY") {
          nextStart = addWeeks(nextStart, 1);
        } else if (event.recurrence === "MONTHLY") {
          nextStart = addMonths(nextStart, 1);
        }

        if (instanceStart.getTime() === eventStart.getTime()) {
          // If we are deleting the very first occurrence, simply shift the parent start time!
          const limitDate = event.recurrenceEnd ? new Date(event.recurrenceEnd) : null;
          if (limitDate && nextStart > limitDate) {
            // No occurrences left, delete entirely
            await db.calendarEvent.deleteMany({
              where: { id: originalId, userId: auth.userId! }
            });
          } else {
            await db.calendarEvent.update({
              where: { id: originalId },
              data: {
                startAt: nextStart,
                endAt: new Date(nextStart.getTime() + durationMs)
              }
            });
          }
        } else {
          // Splitting or terminating. Set the current event recurrenceEnd to the day before the deleted instance.
          const newEndLimit = new Date(instanceStart.getTime() - 1000); // 1 second before
          await db.calendarEvent.update({
            where: { id: originalId },
            data: {
              recurrenceEnd: newEndLimit
            }
          });

          // Check if we should create a new series after the deleted instance
          const originalRecurenceEnd = event.recurrenceEnd ? new Date(event.recurrenceEnd) : addMonths(new Date(), 6);
          if (nextStart <= originalRecurenceEnd) {
            await db.calendarEvent.create({
              data: {
                userId: auth.userId!,
                title: event.title,
                description: event.description,
                startAt: nextStart,
                endAt: new Date(nextStart.getTime() + durationMs),
                allDay: event.allDay,
                tagId: event.tagId,
                color: event.color,
                notification: event.notification,
                noteColor: event.noteColor,
                recurrence: event.recurrence,
                recurrenceEnd: event.recurrenceEnd
              }
            });
          }
        }
        return NextResponse.json({ ok: true });
      }
    }

    // Normal non-recurring or parent event ID deletion
    if (mode === "one" && !id.includes("_rec_")) {
      const event = await db.calendarEvent.findFirst({
        where: { id, userId: auth.userId! }
      });
      if (event && event.recurrence && event.recurrence !== "NONE") {
        const eventStart = new Date(event.startAt);
        const eventEnd = new Date(event.endAt);
        const durationMs = eventEnd.getTime() - eventStart.getTime();

        let nextStart = new Date(eventStart);
        if (event.recurrence === "DAILY") {
          nextStart = addDays(nextStart, 1);
        } else if (event.recurrence === "WEEKLY") {
          nextStart = addWeeks(nextStart, 1);
        } else if (event.recurrence === "MONTHLY") {
          nextStart = addMonths(nextStart, 1);
        }

        const limitDate = event.recurrenceEnd ? new Date(event.recurrenceEnd) : null;
        if (limitDate && nextStart > limitDate) {
          await db.calendarEvent.deleteMany({
            where: { id, userId: auth.userId! }
          });
        } else {
          await db.calendarEvent.update({
            where: { id },
            data: {
              startAt: nextStart,
              endAt: new Date(nextStart.getTime() + durationMs)
            }
          });
        }
        return NextResponse.json({ ok: true });
      }
    }

    // Normal deletion of the whole event/recurring series
    await db.calendarEvent.deleteMany({
      where: { id, userId: auth.userId! },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Lỗi máy chủ khi xóa sự kiện lịch." }, { status: 500 });
  }
}
