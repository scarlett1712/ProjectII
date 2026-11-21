/** Calendar form item type: a scheduled event or a task. */
export type ScheduleItemType = "event" | "task";

/** Calendar editor values. Times are local datetime-local strings. */
export interface ScheduleItemDraft {
  itemType: ScheduleItemType;
  title: string;
  description: string;
  /** Event start time or the optional task deadline. */
  startAt: string;
  endAt: string;
  allDay: boolean;
  tagId: string;
  notification: boolean;
  noteColor: string;
  recurrence: string;
  recurrenceEnd: string;
  completed: boolean;
}

/** Request body for the calendar (event) or task API. */
export interface ScheduleItemPayload {
  title: string;
  description: string;
  notification: boolean;
  noteColor: string;
  color: string;
  tagId: string | null;
  recurrence: string;
  recurrenceEnd: string | null;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  dueAt?: string | null;
  completed?: boolean;
}

const toIso = (value: string) => new Date(value).toISOString();

/**
 * Build the API body. Events require startAt and endAt. Tasks use startAt as the deadline, mapping an empty value to null.
 * Set withCompleted to false to omit completed and preserve the completion state on PATCH.
 */
export function buildScheduleItemPayload(
  draft: ScheduleItemDraft,
  { withCompleted = true }: { withCompleted?: boolean } = {},
): ScheduleItemPayload {
  const payload: ScheduleItemPayload = {
    title: draft.title.trim(),
    description: draft.description.trim(),
    notification: draft.notification,
    noteColor: draft.noteColor,
    // Store color as well so the database and older screens use the same color.
    color: draft.noteColor,
    tagId: draft.tagId || null,
    recurrence: draft.recurrence,
    recurrenceEnd: draft.recurrenceEnd ? toIso(draft.recurrenceEnd) : null,
  };

  if (draft.itemType === "event") {
    payload.startAt = toIso(draft.startAt);
    payload.endAt = toIso(draft.endAt);
    payload.allDay = draft.allDay;
  } else {
    payload.dueAt = draft.startAt ? toIso(draft.startAt) : null;
    if (withCompleted) payload.completed = draft.completed;
  }
  return payload;
}
