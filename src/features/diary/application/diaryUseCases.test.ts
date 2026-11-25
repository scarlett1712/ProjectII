import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/diaryRepository", () => ({
  diaryRepository: {
    findMonthPhotos: vi.fn(async () => []),
    findMonthJournalKeys: vi.fn(async () => []),
    findEntry: vi.fn(async () => null),
    findDayPhotos: vi.fn(async () => []),
    upsertEntry: vi.fn(async (_u, dateKey, content, mood) => ({ id: "e1", dateKey, content, mood })),
    findMealOwned: vi.fn(async () => ({ id: "m1" })),
    findTransactionOwned: vi.fn(async () => ({ id: "t1" })),
    createPhoto: vi.fn(async (_u, data) => ({ id: "p1", ...data })),
    updatePhoto: vi.fn(async (_u, id, data) => ({ id, ...data })),
    deletePhoto: vi.fn(async () => true),
  },
}));

vi.mock("@/features/nutrition/application/mealUseCases", () => ({
  createMealEntry: vi.fn(async () => ({ id: "meal-new" })),
}));

vi.mock("@/features/budget/application/budgetUseCases", () => ({
  createTransaction: vi.fn(async () => ({ id: "tx-new" })),
}));

import { createMealEntry } from "@/features/nutrition/application/mealUseCases";
import { createTransaction } from "@/features/budget/application/budgetUseCases";
import { diaryRepository } from "../infrastructure/diaryRepository";
import { createDiaryPhoto, getDiaryDay, getDiaryMonth, saveDiaryEntry } from "./diaryUseCases";

describe("diaryUseCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid month or date keys", async () => {
    await expect(getDiaryMonth("u1", "bad")).rejects.toThrow("diary.invalidDateKey");
    await expect(getDiaryDay("u1", "2026-11")).rejects.toThrow("diary.invalidDateKey");
  });

  it("saves a daily journal entry", async () => {
    const res = await saveDiaryEntry("u1", { dateKey: "2026-11-25", content: "Hôm nay vui", mood: "😊" });
    expect(res).toMatchObject({ dateKey: "2026-11-25", content: "Hôm nay vui", mood: "😊" });
  });

  it("creates a photo and logs new meal and transaction when requested", async () => {
    await createDiaryPhoto("u1", {
      imageData: "data:image/jpeg;base64,abc",
      caption: "Ăn tối",
      dateKey: "2026-11-25",
      newMeal: { mealName: "Bún bò", grams: 400, calories: 550, note: "dinner" },
      newTransaction: { amount: 50000, type: "EXPENSE", note: "Bún bò" },
    });

    expect(createMealEntry).toHaveBeenCalledOnce();
    expect(createTransaction).toHaveBeenCalledOnce();
    expect(diaryRepository.createPhoto).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        dateKey: "2026-11-25",
        caption: "Ăn tối",
        mealId: "meal-new",
        transactionId: "tx-new",
      }),
    );
  });

  it("rejects creating a photo on a future date", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    await expect(
      createDiaryPhoto("u1", {
        imageData: "data:image/jpeg;base64,abc",
        dateKey: futureKey,
      }),
    ).rejects.toThrow("diary.futureDateNotAllowed");
  });

  it("rejects linking an unowned meal", async () => {
    vi.mocked(diaryRepository.findMealOwned).mockResolvedValueOnce(null);
    await expect(
      createDiaryPhoto("u1", {
        imageData: "data:image/jpeg;base64,abc",
        mealId: "other-meal",
      }),
    ).rejects.toThrow("diary.mealNotFound");
  });
});
