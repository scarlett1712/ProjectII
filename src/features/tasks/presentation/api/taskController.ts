import { dateRangeQuerySchema, seriesModeSchema } from "@/shared/application/schemaFields";
import { readJson, withUser } from "@/shared/presentation/http";
import { createTaskSchema, taskIdSchema, updateTaskSchema } from "../../application/taskSchemas";
import { createTask, deleteTask, listTasks, updateTask } from "../../application/taskUseCases";

export const GET = withUser(
  (req, userId) => {
    const { searchParams } = new URL(req.url);
    return listTasks(userId, dateRangeQuerySchema.parse({ start: searchParams.get("start"), end: searchParams.get("end") }));
  },
  { errorCode: "tasks.listFailed" },
);

export const POST = withUser(
  async (req, userId) => createTask(userId, createTaskSchema.parse(await readJson(req))),
  { errorCode: "tasks.createFailed" },
);

export const PATCH = withUser(
  async (req, userId) => {
    const body = await readJson(req);
    const input = updateTaskSchema.parse(body);
    const mode = seriesModeSchema.parse(new URL(req.url).searchParams.get("mode") || (body as { mode?: unknown }).mode);
    return updateTask(userId, input, mode);
  },
  { errorCode: "tasks.updateFailed" },
);

export const DELETE = withUser(
  async (req, userId) => {
    const { searchParams } = new URL(req.url);
    const id = taskIdSchema.parse(searchParams.get("id") || undefined);
    await deleteTask(userId, id, seriesModeSchema.parse(searchParams.get("mode")));
    return { ok: true };
  },
  { errorCode: "tasks.deleteFailed" },
);
