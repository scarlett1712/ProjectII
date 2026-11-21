import { keep, mergeFields, type SeriesAdapter, type SeriesMode, type SeriesSnapshot } from "@/shared/domain/recurringSeries";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  createdAt: Date;
  completed: boolean;
  tagId: string | null;
  color: string | null;
  notification: boolean;
  noteColor: string | null;
  recurrence: string | null;
  recurrenceEnd: Date | null;
}

/** Task creation fields. Omitting completed uses the database default of false. */
export interface TaskFields {
  title: string;
  description: string | null;
  dueAt: Date | null;
  completed?: boolean;
  tagId: string | null;
  color: string | null;
  notification: boolean;
  noteColor: string | null;
  recurrence: string | null;
  recurrenceEnd: Date | null;
}

/**
 * Normalized client changes: undefined preserves the value and null clears it.
 * Empty tagId, dueAt and recurrenceEnd values have already been converted to null.
 */
export interface TaskPatch {
  title?: string;
  description?: string | null;
  dueAt?: Date | null;
  completed?: boolean;
  tagId?: string | null;
  color?: string | null;
  notification?: boolean;
  noteColor?: string | null;
  recurrence?: string | null;
  recurrenceEnd?: Date | null;
}

/** Task recurrence starts at the deadline, or the creation date if there is no deadline. */
export function taskSeriesSnapshot(task: Task): SeriesSnapshot {
  return {
    start: new Date(task.dueAt || task.createdAt),
    recurrence: task.recurrence,
    recurrenceEnd: task.recurrenceEnd ? new Date(task.recurrenceEnd) : null,
  };
}

/**
 * Default an occurrence ID to "one". Completing a recurring task also defaults to "one"
 * to complete only that occurrence. Other requests default to "all".
 */
export function defaultTaskEditMode(params: { isInstance: boolean; isRecurring: boolean; completing: boolean }): SeriesMode {
  if (params.isInstance) return "one";
  if (params.completing && params.isRecurring) return "one";
  return "all";
}

/** Fields copied to a continuation series or detached task. Completion belongs to individual occurrences. */
const COPIED_FIELDS = ["title", "description", "tagId", "color", "notification", "noteColor"] as const;

/** Editing a single occurrence in "one" mode creates a standalone, nonrecurring task. */
export function detachedTaskFields(task: Task, patch: TaskPatch, instanceStart: Date): TaskFields {
  return {
    ...mergeFields(task, patch, COPIED_FIELDS),
    dueAt: patch.dueAt !== undefined ? patch.dueAt : task.dueAt ? instanceStart : null,
    completed: patch.completed ?? false,
    recurrence: "NONE",
    recurrenceEnd: null,
  };
}

/** Series data after a "future" edit. The caller supplies dueAt. */
export function editedSeriesFields(task: Task, patch: TaskPatch, dueAt: Date | null): TaskFields {
  return {
    ...mergeFields(task, patch, COPIED_FIELDS),
    dueAt,
    recurrence: keep(patch.recurrence, task.recurrence),
    recurrenceEnd: keep(patch.recurrenceEnd, task.recurrenceEnd),
  };
}

export const taskSeries: SeriesAdapter<Task, TaskFields, TaskPatch> = {
  snapshot: taskSeriesSnapshot,
  shiftTo: (_, start) => ({ dueAt: start }),
  continueAt: (task, start) => editedSeriesFields(task, {}, start),
  detached: detachedTaskFields,
  // Editing the original series preserves its possibly null deadline. A split starts at the selected occurrence.
  // A null dueAt cannot clear the deadline here, matching the previous API.
  edited: (task, patch, instanceStart, splitting) =>
    editedSeriesFields(task, patch, patch.dueAt || (splitting ? instanceStart : task.dueAt)),
};
