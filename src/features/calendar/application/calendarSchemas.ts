import { z } from "zod";
import { messageKey } from "@/shared/application/errors";
import { clearableDate, nullableText as text, optionalDate, optionalFlag, recurrenceField, INVALID_DATE_MESSAGE } from "@/shared/application/schemaFields";
import type { CalendarEventPatch } from "../domain/eventSeries";

const MISSING_EVENT_ID = messageKey("calendar.event.missingId");
const MISSING_TAG_FIELDS = messageKey("calendar.tag.missingFields");
const MISSING_TAG_INFO = messageKey("calendar.tag.missingInfo");
const MISSING_TAG_ID = messageKey("calendar.tag.missingId");

const eventFields = {
  description: text(messageKey("calendar.event.invalidDescription")),
  allDay: optionalFlag,
  tagId: text(messageKey("calendar.event.invalidTag")),
  color: text(messageKey("calendar.event.invalidColor")),
  notification: optionalFlag,
  noteColor: text(messageKey("calendar.event.invalidNoteColor")),
  recurrence: recurrenceField(messageKey("calendar.event.invalidRecurrence")),
  recurrenceEnd: clearableDate,
};

export const createCalendarEventSchema = z.object(
  {
    title: z.string({ error: messageKey("calendar.event.missingTitle") }),
    startAt: z.coerce.date({ error: INVALID_DATE_MESSAGE }),
    endAt: z.coerce.date({ error: INVALID_DATE_MESSAGE }),
    ...eventFields,
  },
  { error: messageKey("calendar.event.invalidData") },
).refine((event) => event.endAt >= event.startAt, {
  message: messageKey("calendar.event.endBeforeStart"),
  path: ["endAt"],
});

export const updateCalendarEventSchema = z.object(
  {
    id: z.string({ error: MISSING_EVENT_ID }).min(1, MISSING_EVENT_ID),
    title: z.string({ error: messageKey("calendar.event.invalidTitle") }).optional(),
    startAt: optionalDate,
    endAt: optionalDate,
    ...eventFields,
  },
  { error: MISSING_EVENT_ID },
);

export const calendarEventIdSchema = z.string({ error: MISSING_EVENT_ID }).min(1, MISSING_EVENT_ID);

export type CreateCalendarEventInput = CalendarEventPatch & { title: string; startAt: Date; endAt: Date };

export type UpdateCalendarEventInput = CalendarEventPatch & { id: string };

/** Accept any truthy value and convert it to a trimmed string, matching the previous API. */
const requiredTagText = (message: string) =>
  z.unknown().transform((v, ctx) => {
    if (!v) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return String(v).trim();
  });

export const createTagSchema = z.object(
  { name: requiredTagText(MISSING_TAG_FIELDS), color: requiredTagText(MISSING_TAG_FIELDS) },
  { error: MISSING_TAG_FIELDS },
);

export const updateTagSchema = z.object(
  {
    id: z.string({ error: MISSING_TAG_INFO }).min(1, MISSING_TAG_INFO),
    name: requiredTagText(MISSING_TAG_INFO),
    color: requiredTagText(MISSING_TAG_INFO),
  },
  { error: MISSING_TAG_INFO },
);

export const tagIdSchema = z.string({ error: MISSING_TAG_ID }).min(1, MISSING_TAG_ID);

export interface CreateTagInput {
  name: string;
  color: string;
}

export interface UpdateTagInput extends CreateTagInput {
  id: string;
}
