import { notFound } from "@/shared/application/errors";
import { parseCalorieEstimate, parsePortionSuggestions, type PortionOption } from "../domain/aiResponse";
import { estimateCaloriesHeuristically } from "../domain/calorieHeuristic";
import { mealRepository } from "../infrastructure/mealRepository";
import { nutritionAiClient } from "../infrastructure/nutritionAiClient";
import type { CreateMealInput, EstimateMealCaloriesInput, UpdateMealInput } from "./mealSchemas";
import {
  CALORIE_SYSTEM_PROMPT,
  PORTIONS_SYSTEM_PROMPT,
  buildCalorieEstimationPrompt,
  buildPortionSuggestionPrompt,
} from "./nutritionPrompts";

const RECENT_MEAL_LIMIT = 50;

export function listRecentMeals(userId: string) {
  return mealRepository.findRecent(userId, RECENT_MEAL_LIMIT);
}

/** Meals since the supplied timestamp, newest first, for the chatbot's nutrition history. */
export function listMealsSince(userId: string, since: Date) {
  return mealRepository.findSince(userId, since);
}

/** Log a meal from either the nutrition screen or the chatbot's log_meal tool. */
export function createMealEntry(userId: string, input: CreateMealInput) {
  return mealRepository.create(userId, {
    mealName: input.mealName,
    grams: input.grams,
    calories: input.calories,
    eatenAt: input.eatenAt ?? new Date(),
    note: input.note ?? null,
  });
}

export function updateMealEntry(userId: string, id: string, input: UpdateMealInput) {
  return mealRepository.update(userId, id, input);
}

export function deleteMealEntry(userId: string, id: string) {
  return mealRepository.delete(userId, id);
}

/** Estimate calories with AI or a fallback heuristic and update the meal. */
export async function estimateMealCalories(userId: string, input: EstimateMealCaloriesInput) {
  const meal = await mealRepository.findById(userId, input.mealId);
  if (!meal) throw notFound("nutrition.mealNotFound");

  const text = await nutritionAiClient.complete({
    systemPrompt: CALORIE_SYSTEM_PROMPT,
    userPrompt: buildCalorieEstimationPrompt(meal.mealName, input.portionLabel, input.portionValue),
    purpose: "calorie estimation",
  });

  let estimate = parseCalorieEstimate(text ?? "");
  if (estimate.calories <= 0) {
    estimate = estimateCaloriesHeuristically(meal.mealName, input.portionLabel, input.portionValue);
  }

  const updatedMeal = await mealRepository.update(userId, meal.id, { calories: estimate.calories });
  return { success: true, meal: updatedMeal, explanation: estimate.explanation };
}

/** Suggest three portions with AI, falling back to the default portions on failure. */
export async function suggestPortions(mealName: string): Promise<{ portions: PortionOption[] }> {
  const text = await nutritionAiClient.complete({
    systemPrompt: PORTIONS_SYSTEM_PROMPT,
    userPrompt: buildPortionSuggestionPrompt(mealName),
    purpose: "portions suggestion",
  });
  return { portions: parsePortionSuggestions(text ?? "") };
}
