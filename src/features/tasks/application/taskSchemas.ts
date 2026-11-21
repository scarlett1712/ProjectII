import { z } from "zod";
import { messageKey } from "@/shared/application/errors";
import { clearableDate, nullableText as text, optionalFlag, recurrenceField } from "@/shared/application/schemaFields";
import type { TaskPatch } from "../domain/taskSeries";

const MISSING_TASK_ID = messageKey("tasks.missingId");

const taskFields = {
  description: text(messageKey("tasks.invalidDescription")),
  dueAt: clearableDate,
  completed: optionalFlag,
  // An empty tag clears the existing tag.
  tagId: z.preprocess((v) => (v === undefined ? undefined : v || null), text(messageKey("tasks.invalidTag"))),
  color: text(messageKey("tasks.invalidColor")),
  notification: optionalFlag,
  noteColor: text(messageKey("tasks.invalidNoteColor")),
  recurrence: recurrenceField(messageKey("tasks.invalidRecurrence")),
  recurrenceEnd: clearableDate,
};

export const createTaskSchema = z.object(
  { title: z.string({ error: messageKey("tasks.missingTitle") }), ...taskFields },
  { error: messageKey("tasks.invalidData") },
);

export const updateTaskSchema = z.object(
  {
    id: z.string({ error: MISSING_TASK_ID }).min(1, MISSING_TASK_ID),
    title: z.string({ error: messageKey("tasks.invalidTitle") }).optional(),
    ...taskFields,
  },
  { error: MISSING_TASK_ID },
);

export const taskIdSchema = z.string({ error: MISSING_TASK_ID }).min(1, MISSING_TASK_ID);

export type CreateTaskInput = TaskPatch & { title: string };

export type UpdateTaskInput = TaskPatch & { id: string };
