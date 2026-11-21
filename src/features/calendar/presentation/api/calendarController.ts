import { dateRangeQuerySchema, seriesModeSchema } from "@/shared/application/schemaFields";
import { readJson, withUser } from "@/shared/presentation/http";
import {
  calendarEventIdSchema,
  createCalendarEventSchema,
  updateCalendarEventSchema,
} from "../../application/calendarSchemas";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from "../../application/calendarUseCases";

export const GET = withUser(
  (req, userId) => {
    const { searchParams } = new URL(req.url);
    return listCalendarEvents(userId, dateRangeQuerySchema.parse({ start: searchParams.get("start"), end: searchParams.get("end") }));
  },
  { errorCode: "calendar.event.listFailed" },
);

export const POST = withUser(
  async (req, userId) => createCalendarEvent(userId, createCalendarEventSchema.parse(await readJson(req))),
  { errorCode: "calendar.event.createFailed" },
);

export const PATCH = withUser(
  async (req, userId) => {
    const body = await readJson(req);
    const input = updateCalendarEventSchema.parse(body);
    const mode = seriesModeSchema.parse(new URL(req.url).searchParams.get("mode") || (body as { mode?: unknown }).mode);
    return updateCalendarEvent(userId, input, mode);
  },
  { errorCode: "calendar.event.updateFailed" },
);

export const DELETE = withUser(
  async (req, userId) => {
    const { searchParams } = new URL(req.url);
    const id = calendarEventIdSchema.parse(searchParams.get("id") || undefined);
    await deleteCalendarEvent(userId, id, seriesModeSchema.parse(searchParams.get("mode")));
    return { ok: true };
  },
  { errorCode: "calendar.event.deleteFailed" },
);
