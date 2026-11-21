import { describe, expect, it } from "vitest";
import { MEAL_CATEGORIES, defaultMealTime, mealCategoryForHour } from "./mealCategories";

describe("mealCategoryForHour", () => {
  it("maps hours of the day to meals", () => {
    expect(mealCategoryForHour(7)).toBe(MEAL_CATEGORIES.breakfast);
    expect(mealCategoryForHour(11)).toBe(MEAL_CATEGORIES.lunch);
    expect(mealCategoryForHour(15)).toBe(MEAL_CATEGORIES.snack);
    expect(mealCategoryForHour(19)).toBe(MEAL_CATEGORIES.dinner);
    expect(mealCategoryForHour(23)).toBe(MEAL_CATEGORIES.snack);
    expect(mealCategoryForHour(3)).toBe(MEAL_CATEGORIES.snack);
  });

  it("suggests a default time per meal", () => {
    expect(defaultMealTime(MEAL_CATEGORIES.lunch)).toBe("12:00");
    expect(defaultMealTime("lạ")).toBe("07:00");
  });
});
