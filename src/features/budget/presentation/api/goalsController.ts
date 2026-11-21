import { readJson, withUser } from "@/shared/presentation/http";
import { goalPeriodSchema, upsertGoalSchema } from "../../application/budgetSchemas";
import { listGoals, upsertGoal } from "../../application/budgetUseCases";

const options = { errorCode: "common.serverError" } as const;

export const GET = withUser((req, userId) => {
  const { searchParams } = new URL(req.url);
  const { year, month } = goalPeriodSchema.parse({
    year: searchParams.get("year"),
    month: searchParams.get("month"),
  });
  return listGoals(userId, year, month);
}, options);

export const POST = withUser(async (req, userId) => {
  return upsertGoal(userId, upsertGoalSchema.parse(await readJson(req)));
}, options);
