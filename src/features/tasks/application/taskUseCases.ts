import { defaultSeriesWindow, generateRecurringTaskInstances } from "@/shared/domain/recurrence";
import {
  isRecurringRule,
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
import { defaultTaskEditMode, taskSeries, type TaskFields } from "../domain/taskSeries";
import { taskRepository } from "../infrastructure/taskRepository";
import type { CreateTaskInput, UpdateTaskInput } from "./taskSchemas";

export interface TaskWindow {
  /** Default to three months ago. */
  start?: Date;
  /** Default to six months from now. */
  end?: Date;
}

/** List tasks and expand recurring tasks into occurrences within the requested time range. */
export async function listTasks(userId: string, window: TaskWindow = {}) {
  const defaults = defaultSeriesWindow();
  const windowStart = window.start ?? defaults.start;
  const windowEnd = window.end ?? defaults.end;
  const tasks = await taskRepository.findAll(userId);
  return tasks.flatMap((task) => generateRecurringTaskInstances(task, windowStart, windowEnd));
}

export function createTask(userId: string, input: CreateTaskInput) {
  return taskRepository.create(userId, {
    title: input.title,
    description: input.description ?? null,
    dueAt: input.dueAt ?? null,
    tagId: input.tagId ?? null,
    color: input.color ?? null,
    notification: input.notification ?? false,
    noteColor: input.noteColor ?? null,
    recurrence: input.recurrence ?? null,
    recurrenceEnd: input.recurrenceEnd ?? null,
  });
}

/**
 * For recurring task edits, requestedMode selects the scope. "one" detaches the occurrence as its own task,
 * "future" updates this and later occurrences, and "all" updates the series identified by seriesIdOf(id). Omission uses defaultTaskEditMode.
 * Calendar events share this flow through planSeriesUpdate.
 */
export async function updateTask(userId: string, input: UpdateTaskInput, requestedMode?: unknown) {
  const { id, ...patch } = input;
  const ref = parseInstanceId(id);
  const task = await taskRepository.findById(userId, ref.seriesId);
  if (!task) throw notFound("tasks.notFound");

  const isRecurring = ref.isInstance || isRecurringRule(task.recurrence);
  const mode = resolveSeriesMode(
    requestedMode,
    defaultTaskEditMode({ isInstance: ref.isInstance, isRecurring, completing: patch.completed !== undefined }),
    "all",
  );

  const action = planSeriesUpdate(taskSeries, task, ref, patch, mode);
  if (action.kind === "wholeRecord") return taskRepository.updateAndFind(userId, ref.seriesId, sentFields(patch));
  return taskRepository.applySeriesWrites(userId, ref.seriesId, requireWrites(action));
}

/**
 * For an occurrence ID (_rec_), "one" or an omitted mode skips the occurrence, "future" removes this
 * and later occurrences, and "all" removes the series. For a series ID, "one" skips the first occurrence, otherwise delete the record.
 * Calendar events share this flow through planSeriesDelete.
 */
export async function deleteTask(userId: string, id: string, requestedMode?: unknown) {
  const ref = parseInstanceId(id);
  const mode = resolveDeleteMode(ref, requestedMode);
  const task = mode === "all" ? null : await taskRepository.findById(userId, ref.seriesId);

  const action = planSeriesDelete(taskSeries, task, ref, mode);
  if (action.kind === "wholeRecord") {
    await taskRepository.deleteById(userId, ref.seriesId);
    return;
  }
  await taskRepository.applySeriesWrites(userId, ref.seriesId, requireWrites(action));
}

function requireWrites(action: SeriesAction<TaskFields>): SeriesWrite<TaskFields>[] {
  if (action.kind === "notFound") throw notFound("tasks.notFound");
  if (action.kind === "invalidId") throw badRequest("tasks.invalidId");
  if (action.kind !== "writes") throw new Error(`Unexpected series action ${action.kind}`);
  return action.writes;
}
