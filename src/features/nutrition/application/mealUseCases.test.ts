import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/mealRepository", () => ({
  mealRepository: {
    findRecent: vi.fn(),
    findSince: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("../infrastructure/nutritionAiClient", () => ({
  nutritionAiClient: { complete: vi.fn() },
}));

import { HttpError } from "@/shared/application/errors";
import { DEFAULT_PORTIONS } from "../domain/aiResponse";
import { mealRepository } from "../infrastructure/mealRepository";
import { nutritionAiClient } from "../infrastructure/nutritionAiClient";
import { createMealSchema, estimateMealCaloriesSchema, updateMealSchema } from "./mealSchemas";
import { createMealEntry, estimateMealCalories, listRecentMeals, suggestPortions } from "./mealUseCases";

const meal = { id: "m1", userId: "u1", mealName: "Phở bò", grams: 300, calories: 0 };

describe("meal use cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listRecentMeals reads the last 50 meals", async () => {
    await listRecentMeals("u1");
    expect(mealRepository.findRecent).toHaveBeenCalledWith("u1", 50);
  });

  it("createMealEntry defaults eatenAt to now and note to null", async () => {
    const before = Date.now();
    await createMealEntry("u1", { mealName: "Cơm", grams: 200, calories: 400 });

    const [userId, data] = vi.mocked(mealRepository.create).mock.calls[0];
    expect(userId).toBe("u1");
    expect(data).toMatchObject({ mealName: "Cơm", grams: 200, calories: 400, note: null });
    expect(data.eatenAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("estimateMealCalories throws 404 when the meal is not the user's", async () => {
    vi.mocked(mealRepository.findById).mockResolvedValue(null);
    await expect(estimateMealCalories("u1", { mealId: "m1", portionLabel: "Bát vừa" })).rejects.toMatchObject({
      status: 404,
      code: "nutrition.mealNotFound",
    });
    expect(HttpError).toBeDefined();
  });

  it("estimateMealCalories saves the AI estimate", async () => {
    vi.mocked(mealRepository.findById).mockResolvedValue(meal as never);
    vi.mocked(nutritionAiClient.complete).mockResolvedValue('{"calories": 480, "explanation": "Star nè 🍜"}');
    vi.mocked(mealRepository.update).mockResolvedValue({ ...meal, calories: 480 } as never);

    const result = await estimateMealCalories("u1", { mealId: "m1", portionLabel: "Bát vừa", portionValue: "medium" });

    expect(vi.mocked(nutritionAiClient.complete).mock.calls[0][0].userPrompt).toContain('Món ăn: "Phở bò"');
    expect(mealRepository.update).toHaveBeenCalledWith("u1", "m1", { calories: 480 });
    expect(result).toEqual({ success: true, meal: { ...meal, calories: 480 }, explanation: "Star nè 🍜" });
  });

  it("estimateMealCalories falls back to the heuristic when the AI fails", async () => {
    vi.mocked(mealRepository.findById).mockResolvedValue(meal as never);
    vi.mocked(nutritionAiClient.complete).mockResolvedValue(null);

    const result = await estimateMealCalories("u1", { mealId: "m1", portionLabel: "Bát lớn", portionValue: "large" });

    // Noodle soup (300) plus beef (200), scaled by 1.35, gives 675.
    expect(mealRepository.update).toHaveBeenCalledWith("u1", "m1", { calories: 675 });
    expect(result.explanation).toContain("675 kcal");
  });

  it("suggestPortions returns defaults when the AI fails", async () => {
    vi.mocked(nutritionAiClient.complete).mockResolvedValue(null);
    expect(await suggestPortions("Phở")).toEqual({ portions: DEFAULT_PORTIONS });
  });
});

describe("meal schemas", () => {
  it("createMealSchema coerces numbers and treats empty eatenAt as missing", () => {
    expect(createMealSchema.parse({ mealName: "Cơm", grams: "150", calories: 300, eatenAt: "" })).toEqual({
      mealName: "Cơm",
      grams: 150,
      calories: 300,
      note: null,
    });
  });

  it("createMealSchema rejects non-numeric calories", () => {
    expect(() => createMealSchema.parse({ mealName: "Cơm", grams: 1, calories: "abc" })).toThrow("nutrition.invalidCalories");
  });

  it("updateMealSchema keeps only provided fields and trims the name", () => {
    expect(updateMealSchema.parse({ id: "m1", mealName: "  Phở  ", grams: "200" })).toEqual({
      id: "m1",
      mealName: "Phở",
      grams: 200,
    });
    expect(() => updateMealSchema.parse({ mealName: "x" })).toThrow("nutrition.missingMealId");
  });

  it("estimateMealCaloriesSchema reports the legacy missing-field message", () => {
    expect(() => estimateMealCaloriesSchema.parse({ mealId: "m1", portionLabel: "" })).toThrow(
      "nutrition.missingEstimateFields",
    );
  });
});
