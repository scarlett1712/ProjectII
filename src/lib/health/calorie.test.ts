import { describe, expect, it } from "vitest";
import { calculateDailyCalories } from "./calorie";

describe("calculateDailyCalories", () => {
  it("calculates for male input", () => {
    const result = calculateDailyCalories({
      gender: "male",
      weightKg: 70,
      heightCm: 175,
      age: 25,
      activityLevel: "moderate",
    });
    expect(result).toBeGreaterThan(2000);
  });
});
