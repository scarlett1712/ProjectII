import { readJson, withUser } from "@/shared/presentation/http";
import { createMealSchema, deleteMealSchema, updateMealSchema } from "../../application/mealSchemas";
import { createMealEntry, deleteMealEntry, listRecentMeals, updateMealEntry } from "../../application/mealUseCases";

export const GET = withUser((_req, userId) => listRecentMeals(userId));

export const POST = withUser(async (req, userId) => createMealEntry(userId, createMealSchema.parse(await readJson(req))));

export const DELETE = withUser(async (req, userId) => {
  const { searchParams } = new URL(req.url);
  const { id } = deleteMealSchema.parse({ id: searchParams.get("id") ?? undefined });
  await deleteMealEntry(userId, id, { deletePhotos: searchParams.get("deletePhotos") === "1" });
  return { ok: true };
});

export const PATCH = withUser(
  async (req, userId) => {
    const { id, ...input } = updateMealSchema.parse(await readJson(req));
    return updateMealEntry(userId, id, input);
  },
  { errorCode: "nutrition.updateFailed" },
);
