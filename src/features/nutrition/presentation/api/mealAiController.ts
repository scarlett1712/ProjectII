import { readJson, withUser } from "@/shared/presentation/http";
import type { ApiMessageKey } from "@/shared/i18n/apiTranslator";
import { estimateMealCaloriesSchema, suggestPortionsSchema } from "../../application/mealSchemas";
import { estimateMealCalories, suggestPortions } from "../../application/mealUseCases";

const errorCode = "common.serverError" satisfies ApiMessageKey;
/** Each request makes an LLM call. Limit each endpoint to 20 requests per minute per IP. */
const aiRateLimit = (keyPrefix: string) => ({ keyPrefix, limit: 20, windowMs: 60_000 });

export const estimatePOST = withUser(
  async (req, userId) => estimateMealCalories(userId, estimateMealCaloriesSchema.parse(await readJson(req))),
  { errorCode, rateLimit: aiRateLimit("meal-estimate") },
);

export const suggestPortionsPOST = withUser(
  async (req) => suggestPortions(suggestPortionsSchema.parse(await readJson(req)).mealName),
  { errorCode, rateLimit: aiRateLimit("meal-portions") },
);
