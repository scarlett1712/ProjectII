import { keep, mergeFields, type SeriesAdapter, type SeriesSnapshot } from "@/shared/domain/recurringSeries";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  tagId: string | null;
  color: string | null;
  notification: boolean;
  noteColor: string | null;
  recurrence: string | null;
  recurrenceEnd: Date | null;
}

export type CalendarEventFields = Omit<CalendarEvent, "id">;

/** Client patch semantics: undefined preserves the current field. Treat empty startAt and endAt values as omitted. */
export interface CalendarEventPatch {
  title?: string;
  description?: string | null;
  startAt?: Date;
  endAt?: Date;
  allDay?: boolean;
  tagId?: string | null;
  color?: string | null;
  notification?: boolean;
  noteColor?: string | null;
  recurrence?: string | null;
  recurrenceEnd?: Date | null;
}

export function eventSeriesSnapshot(event: CalendarEvent): SeriesSnapshot {
  return {
    start: new Date(event.startAt),
    recurrence: event.recurrence,
    recurrenceEnd: event.recurrenceEnd ? new Date(event.recurrenceEnd) : null,
  };
}

export function eventDurationMs(event: CalendarEvent): number {
  return new Date(event.endAt).getTime() - new Date(event.startAt).getTime();
}

/** Fields copied unchanged to a continuation series or detached occurrence. */
const COPIED_FIELDS = ["title", "description", "allDay", "tagId", "color", "notification", "noteColor"] as const;

/** Editing a single occurrence in "one" mode creates an independent, nonrecurring event. */
export function detachedEventFields(
  event: CalendarEvent,
  patch: CalendarEventPatch,
  instanceStart: Date,
): CalendarEventFields {
  return {
    ...mergeFields(event, patch, COPIED_FIELDS),
    ...editedTimes(event, patch, instanceStart),
    recurrence: "NONE",
    recurrenceEnd: null,
  };
}

/** Series data after a "future" edit. Start at instanceStart unless the time changed. */
export function editedSeriesFields(
  event: CalendarEvent,
  patch: CalendarEventPatch,
  instanceStart: Date,
): CalendarEventFields {
  return {
    ...mergeFields(event, patch, COPIED_FIELDS),
    ...editedTimes(event, patch, instanceStart),
    recurrence: keep(patch.recurrence, event.recurrence),
    recurrenceEnd: keep(patch.recurrenceEnd, event.recurrenceEnd),
  };
}

/** Preserve event duration when moving or splitting occurrences. */
export const eventSeries: SeriesAdapter<CalendarEvent, CalendarEventFields, CalendarEventPatch> = {
  snapshot: eventSeriesSnapshot,
  shiftTo: (event, start) => timesAt(event, start),
  continueAt: (event, start) => editedSeriesFields(event, {}, start),
  detached: detachedEventFields,
  // The first occurrence starts at startAt, so both direct edits and splits use instanceStart as their time origin.
  edited: (event, patch, instanceStart) => editedSeriesFields(event, patch, instanceStart),
};

function editedTimes(event: CalendarEvent, patch: CalendarEventPatch, instanceStart: Date) {
  const times = timesAt(event, instanceStart);
  return { startAt: patch.startAt ?? times.startAt, endAt: patch.endAt ?? times.endAt };
}

function timesAt(event: CalendarEvent, start: Date) {
  return { startAt: start, endAt: new Date(start.getTime() + eventDurationMs(event)) };
}
