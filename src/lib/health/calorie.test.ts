import { describe, expect, it } from "vitest";
import { calculateDailyCalories } from "./calorie";

describe("calculateDailyCalories", () => {
  it("calculates for male with moderate activity", () => {
    const result = calculateDailyCalories({
      gender: "male",
      weightKg: 70,
      heightCm: 175,
      age: 25,
      activityLevel: "moderate",
    });
    // BMR = 10*70 + 6.25*175 - 5*25 + 5 = 700 + 1093.75 - 125 + 5 = 1673.75
    // TDEE = 1673.75 * 1.55 = 2594.3125 -> Math.round = 2594
    expect(result).toBe(2594);
  });

  it("calculates for female with sedentary activity", () => {
    const result = calculateDailyCalories({
      gender: "female",
      weightKg: 50,
      heightCm: 160,
      age: 22,
      activityLevel: "sedentary",
    });
    // BMR = 10*50 + 6.25*160 - 5*22 - 161 = 500 + 1000 - 110 - 161 = 1229
    // TDEE = 1229 * 1.2 = 1474.8 -> Math.round = 1475
    expect(result).toBe(1475);
  });

  it("calculates for very active male", () => {
    const result = calculateDailyCalories({
      gender: "male",
      weightKg: 80,
      heightCm: 180,
      age: 30,
      activityLevel: "very_active",
    });
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    // TDEE = 1780 * 1.9 = 3382
    expect(result).toBe(3382);
  });

  it("handles light and active activity levels accurately", () => {
    const light = calculateDailyCalories({
      gender: "female",
      weightKg: 55,
      heightCm: 165,
      age: 28,
      activityLevel: "light",
    });
    const active = calculateDailyCalories({
      gender: "female",
      weightKg: 55,
      heightCm: 165,
      age: 28,
      activityLevel: "active",
    });
    expect(active).toBeGreaterThan(light);
  });
});
