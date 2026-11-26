/** Meal as returned by /api/meals. The note field stores the meal category (see MEAL_CATEGORIES). */
export type Meal = {
  id: string;
  mealName: string;
  calories: number;
  grams: number;
  eatenAt: string;
  note?: string | null;
  _count?: { diaryPhotos?: number };
};

/** Meal category display settings: label, emoji, Tailwind classes and time grid color. */
export type MealCategoryDetails = { label: string; emoji: string; bg: string; fill: string; border: string; text: string };
