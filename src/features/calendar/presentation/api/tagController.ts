import { readJson, withUser } from "@/shared/presentation/http";
import { createTagSchema, tagIdSchema, updateTagSchema } from "../../application/calendarSchemas";
import { createTag, deleteTag, listTags, updateTag } from "../../application/tagUseCases";

export const GET = withUser((_req, userId) => listTags(userId), { errorCode: "calendar.tag.listFailed" });

export const POST = withUser(
  async (req, userId) => createTag(userId, createTagSchema.parse(await readJson(req))),
  { errorCode: "calendar.tag.createFailed" },
);

export const PATCH = withUser(
  async (req, userId) => {
    await updateTag(userId, updateTagSchema.parse(await readJson(req)));
    return { ok: true };
  },
  { errorCode: "calendar.tag.updateFailed" },
);

export const DELETE = withUser(
  async (req, userId) => {
    await deleteTag(userId, tagIdSchema.parse(new URL(req.url).searchParams.get("id") || undefined));
    return { ok: true };
  },
  { errorCode: "calendar.tag.deleteFailed" },
);
