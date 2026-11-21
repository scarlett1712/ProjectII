import { defaultSeriesWindow, generateRecurringInstances } from "@/shared/domain/recurrence";
import {
  parseInstanceId,
  planSeriesDelete,
  planSeriesUpdate,
  resolveDeleteMode,
  resolveSeriesMode,
  sentFields,
  type SeriesAction,
  type SeriesWrite,
} from "@/shared/domain/recurringSeries";
import { badRequest, notFound } from "@/shared/application/errors";
import { eventSeries, type CalendarEventFields } from "../domain/eventSeries";
import { calendarRepository } from "../infrastructure/calendarRepository";
import type { CreateCalendarEventInput, UpdateCalendarEventInput } from "./calendarSchemas";

export interface CalendarWindow {
  /** Default to three months ago. */
  start?: Date;
  /** Default to six months from now. */
  end?: Date;
}

/** Events in the requested range, with recurring events expanded into individual occurrences. */
export async function listCalendarEvents(userId: string, window: CalendarWindow = {}) {
  const defaults = defaultSeriesWindow();
  const windowStart = window.start ?? defaults.start;
  const windowEnd = window.end ?? defaults.end;
  const events = await calendarRepository.findAll(userId);
  return events.flatMap((event) => generateRecurringInstances(event, windowStart, windowEnd));
}

export function createCalendarEvent(userId: string, input: CreateCalendarEventInput) {
  return calendarRepository.create(userId, {
    title: input.title,
    description: input.description ?? null,
    startAt: input.startAt,
    endAt: input.endAt,
    allDay: input.allDay ?? false,
    tagId: input.tagId ?? null,
    color: input.color ?? null,
    notification: input.notification ?? false,
    noteColor: input.noteColor ?? null,
    recurrence: input.recurrence ?? null,
    recurrenceEnd: input.recurrenceEnd ?? null,
  });
}

/**
 * Update an event. For recurring events, requestedMode selects the scope: "one" detaches the occurrence,
 * "future" updates this and later occurrences, and "all" updates the series identified by seriesIdOf(id).
 * By default an occurrence ID uses "one" and a series ID uses "all". Tasks share this flow through planSeriesUpdate.
 */
export async function updateCalendarEvent(userId: string, input: UpdateCalendarEventInput, requestedMode?: unknown) {
  const { id, ...patch } = input;
  const ref = parseInstanceId(id);
  const mode = resolveSeriesMode(requestedMode, ref.isInstance ? "one" : "all", "all");

  const event = await calendarRepository.findById(userId, ref.seriesId);
  if (!event) throw notFound("calendar.event.notFound");

  const action = planSeriesUpdate(eventSeries, event, ref, patch, mode);
  if (action.kind === "wholeRecord") return calendarRepository.update(userId, ref.seriesId, sentFields(patch));
  return calendarRepository.applySeriesWrites(userId, ref.seriesId, requireWrites(action));
}

/**
 * Delete an event. For an occurrence ID (_rec_), "one" or an omitted mode skips that occurrence, "future" removes it
 * and later occurrences, and "all" removes the series. For a series ID, "one" skips the first occurrence, otherwise delete the record.
 * Tasks share this flow through planSeriesDelete.
 */
export async function deleteCalendarEvent(userId: string, id: string, requestedMode?: unknown) {
  const ref = parseInstanceId(id);
  const mode = resolveDeleteMode(ref, requestedMode);
  const event = mode === "all" ? null : await calendarRepository.findById(userId, ref.seriesId);

  const action = planSeriesDelete(eventSeries, event, ref, mode);
  if (action.kind === "wholeRecord") {
    await calendarRepository.deleteById(userId, ref.seriesId);
    return;
  }
  await calendarRepository.applySeriesWrites(userId, ref.seriesId, requireWrites(action));
}

function requireWrites(action: SeriesAction<CalendarEventFields>): SeriesWrite<CalendarEventFields>[] {
  if (action.kind === "notFound") throw notFound("calendar.event.notFound");
  if (action.kind === "invalidId") throw badRequest("calendar.event.invalidId");
  if (action.kind !== "writes") throw new Error(`Unexpected series action ${action.kind}`);
  return action.writes;
}
