import { readJson, withUser } from "@/shared/presentation/http";
import { createCategorySchema, idSchema, updateCategorySchema } from "../../application/budgetSchemas";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../../application/budgetUseCases";

const options = { errorCode: "common.serverError" } as const;

export const GET = withUser((_req, userId) => listCategories(userId), options);

export const POST = withUser(async (req, userId) => {
  return createCategory(userId, createCategorySchema.parse(await readJson(req)));
}, options);

export const PATCH = withUser(async (req, userId) => {
  const { id, ...changes } = updateCategorySchema.parse(await readJson(req));
  await updateCategory(userId, id, changes);
  return { ok: true };
}, options);

export const DELETE = withUser(async (req, userId) => {
  const id = idSchema.parse(new URL(req.url).searchParams.get("id") ?? "");
  await deleteCategory(userId, id);
  return { ok: true };
}, options);
