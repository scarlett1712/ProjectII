import { readJson, withUser } from "@/shared/presentation/http";
import { deleteWaterEntrySchema, logWaterSchema, setWaterGoalSchema, waterPostKindSchema } from "../../application/waterSchemas";
import { deleteWaterEntry, getWaterOverview, logWater, setWaterGoal } from "../../application/waterUseCases";

export const GET = withUser((_req, userId) => getWaterOverview(userId));

export const POST = withUser(async (req, userId) => {
  const body = await readJson(req);
  // Type "goal" sets the target. An omitted type or "log" records intake. Other values return 400.
  return waterPostKindSchema.parse(body).type === "goal"
    ? setWaterGoal(userId, setWaterGoalSchema.parse(body))
    : logWater(userId, logWaterSchema.parse(body));
});

export const DELETE = withUser(async (req, userId) => {
  const { searchParams } = new URL(req.url);
  const { id, type } = deleteWaterEntrySchema.parse({
    id: searchParams.get("id") ?? undefined,
    type: searchParams.get("type") ?? undefined,
  });
  await deleteWaterEntry(userId, id, type);
  return { ok: true };
});
