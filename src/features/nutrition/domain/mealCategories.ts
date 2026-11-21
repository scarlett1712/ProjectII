/**
 * Meal category stored in MealEntry.note. These values are persisted and compared in application logic.
 * Display labels come from the common.meal message namespace.
 */
export const MEAL_CATEGORIES = {
  breakfast: "Sáng",
  lunch: "Trưa",
  dinner: "Tối",
  snack: "Vặt",
} as const;

export type MealCategory = (typeof MEAL_CATEGORIES)[keyof typeof MEAL_CATEGORIES];

/** Meal keys such as breakfast identify display labels under common.meal.<key>. */
export type MealCategoryKey = keyof typeof MEAL_CATEGORIES;
export const MEAL_CATEGORY_KEYS = Object.keys(MEAL_CATEGORIES) as MealCategoryKey[];

/** Suggested time when selecting a meal category. */
export const DEFAULT_MEAL_TIME: Record<MealCategory, string> = {
  [MEAL_CATEGORIES.breakfast]: "07:00",
  [MEAL_CATEGORIES.lunch]: "12:00",
  [MEAL_CATEGORIES.dinner]: "18:00",
  [MEAL_CATEGORIES.snack]: "15:00",
};

/** Breakfast at hours 5–10, lunch at 11–14, dinner at 17–22, and snacks at other hours. */
export function mealCategoryForHour(hour: number): MealCategory {
  if (hour >= 5 && hour < 11) return MEAL_CATEGORIES.breakfast;
  if (hour >= 11 && hour < 15) return MEAL_CATEGORIES.lunch;
  if (hour >= 17 && hour < 23) return MEAL_CATEGORIES.dinner;
  return MEAL_CATEGORIES.snack;
}

/** Suggested time for category. Unknown values use the breakfast time. */
export function defaultMealTime(category: string): string {
  return DEFAULT_MEAL_TIME[category as MealCategory] ?? DEFAULT_MEAL_TIME[MEAL_CATEGORIES.breakfast];
}
