import { z } from "zod";
import { optionalDate } from "@/shared/application/schemaFields";
import { messageKey } from "@/shared/application/errors";

const MISSING_MEAL_ID = messageKey("nutrition.missingMealId");
const MISSING_ESTIMATE_FIELDS = messageKey("nutrition.missingEstimateFields");
const MISSING_MEAL_NAME = messageKey("nutrition.missingMealName");

const INVALID_BODY = { error: messageKey("common.invalidBody") };

/** Grams and calories must be finite, nonnegative numbers. */
const number = (message: string) => z.number({ error: message }).finite(message).nonnegative(message);

/** Preserve Number(value) coercion and reject invalid numbers to avoid storing NaN. */
const toNumber = (message: string) => z.preprocess((v) => Number(v), number(message));
const optionalNumber = (message: string) =>
  z.preprocess((v) => (v === undefined ? undefined : Number(v)), number(message).optional());

/** An empty string or null means absent. Other values must be valid dates. */
export const createMealSchema = z.object({
  mealName: z.string({ error: messageKey("nutrition.invalidMealName") }),
  grams: toNumber(messageKey("nutrition.invalidGrams")),
  calories: toNumber(messageKey("nutrition.invalidCalories")),
  eatenAt: optionalDate,
  note: z.string({ error: messageKey("nutrition.invalidNote") }).nullish().transform((v) => v ?? null),
}, INVALID_BODY);

export const updateMealSchema = z.object({
  id: z.string({ error: MISSING_MEAL_ID }).min(1, MISSING_MEAL_ID),
  mealName: z.unknown().transform((v) => String(v).trim()).optional(),
  grams: optionalNumber(messageKey("nutrition.invalidGrams")),
  calories: optionalNumber(messageKey("nutrition.invalidCalories")),
  eatenAt: optionalDate,
  note: z.string({ error: messageKey("nutrition.invalidNote") }).nullable().optional(),
}, INVALID_BODY);

export const deleteMealSchema = z.object({
  id: z.string({ error: MISSING_MEAL_ID }).min(1, MISSING_MEAL_ID),
}, INVALID_BODY);

/** Limit the length of text submitted to the LLM. */
const MAX_AI_TEXT = 200;

export const estimateMealCaloriesSchema = z.object({
  mealId: z.string({ error: MISSING_ESTIMATE_FIELDS }).min(1, MISSING_ESTIMATE_FIELDS),
  portionLabel: z.string({ error: MISSING_ESTIMATE_FIELDS }).min(1, MISSING_ESTIMATE_FIELDS).max(MAX_AI_TEXT, MISSING_ESTIMATE_FIELDS),
  portionValue: z.string().max(MAX_AI_TEXT).nullish(),
}, INVALID_BODY);

export const suggestPortionsSchema = z.object({
  mealName: z.string({ error: MISSING_MEAL_NAME }).min(1, MISSING_MEAL_NAME).max(MAX_AI_TEXT, MISSING_MEAL_NAME),
}, INVALID_BODY);

export interface CreateMealInput {
  mealName: string;
  grams: number;
  calories: number;
  /** An omitted date defaults to the current time. */
  eatenAt?: Date;
  note?: string | null;
}

export interface UpdateMealInput {
  mealName?: string;
  grams?: number;
  calories?: number;
  eatenAt?: Date;
  note?: string | null;
}

export interface EstimateMealCaloriesInput {
  mealId: string;
  portionLabel: string;
  /** Optional portion size: "small", "medium" or "large". */
  portionValue?: string | null;
}
