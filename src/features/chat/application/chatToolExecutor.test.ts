import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/water/application/waterUseCases", () => ({ logWater: vi.fn(async () => ({ id: "w" })) }));
vi.mock("@/features/nutrition/application/mealUseCases", () => ({
  createMealEntry: vi.fn(async () => ({ id: "m" })),
  listMealsSince: vi.fn(async () => []),
}));
vi.mock("@/features/calendar/application/calendarUseCases", () => ({ createCalendarEvent: vi.fn(async () => ({ id: "e" })) }));
vi.mock("@/features/tasks/application/taskUseCases", () => ({ createTask: vi.fn(async () => ({ id: "t" })) }));
vi.mock("@/features/profile/application/profileUseCases", () => ({
  getHealthProfile: vi.fn(),
  recalculateProfileGoals: vi.fn(async () => ({ dailyCalories: 2000, dailyTargetMl: 2000 })),
}));
vi.mock("@/features/budget/application/budgetUseCases", () => ({
  createTransaction: vi.fn(),
  findOrCreateAccountByName: vi.fn(),
  findOrCreateCategoryByName: vi.fn(),
}));
vi.mock("../infrastructure/chatRepository", () => ({
  chatRepository: { logAction: vi.fn(), waterLogsSince: vi.fn(async () => []), transactionHistory: vi.fn(async () => []) },
}));
vi.mock("../infrastructure/webSearchClient", () => ({ searchWeb: vi.fn() }));

import { createCalendarEvent } from "@/features/calendar/application/calendarUseCases";
import { createMealEntry, listMealsSince } from "@/features/nutrition/application/mealUseCases";
import { recalculateProfileGoals } from "@/features/profile/application/profileUseCases";
import { logWater } from "@/features/water/application/waterUseCases";
import { chatRepository } from "../infrastructure/chatRepository";
import { executeChatTool } from "./chatToolExecutor";

const run = (name: string, args: Record<string, unknown>) => executeChatTool(name, args, "u1", "s1");

describe("executeChatTool argument validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-numeric or negative water amounts without writing", async () => {
    for (const amountMl of ["abc", -100, 0]) {
      expect(await run("log_water", { amountMl })).toHaveProperty("error");
    }
    expect(logWater).not.toHaveBeenCalled();
  });

  it("logs a valid water amount as a number", async () => {
    expect(await run("log_water", { amountMl: "250" })).toMatchObject({ success: true, amountMl: 250 });
    expect(logWater).toHaveBeenCalledWith("u1", { amountMl: 250 });
  });

  it("rejects meals with invalid calories", async () => {
    expect(await run("log_meal", { mealName: "Phở", calories: "nhiều" })).toHaveProperty("error");
    expect(createMealEntry).not.toHaveBeenCalled();
  });

  it("rejects events with an invalid date or ending before they start", async () => {
    expect(await run("add_event", { title: "Họp", startAt: "not a date", endAt: "2026-03-10T10:00:00Z" })).toHaveProperty("error");
    expect(
      await run("add_event", { title: "Họp", startAt: "2026-03-10T10:00:00Z", endAt: "2026-03-10T09:00:00Z" }),
    ).toHaveProperty("error");
    expect(createCalendarEvent).not.toHaveBeenCalled();
  });

  it("drops non-positive profile measurements", async () => {
    await run("update_profile_and_recalculate_goals", { weightKg: -5, heightCm: "abc", age: 30 });
    expect(recalculateProfileGoals).toHaveBeenCalledWith("u1", expect.objectContaining({ weightKg: undefined, heightCm: undefined, age: 30 }));
  });

  it("caps history ranges and result sizes", async () => {
    await run("get_nutrition_history", { days: 100000 });
    const since = vi.mocked(listMealsSince).mock.calls[0][1];
    expect(Date.now() - since.getTime()).toBeLessThanOrEqual(91 * 24 * 60 * 60 * 1000);

    await run("get_transaction_history", { limit: 999999, startDate: "garbage" });
    expect(vi.mocked(chatRepository.transactionHistory).mock.calls[0][1].take).toBe(200);
  });
});

describe("add_event timezone", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads times without a timezone as Vietnam time", async () => {
    await run("add_event", { title: "Họp", startAt: "2026-11-15T20:00:00", endAt: "2026-11-15T21:00:00" });
    const input = vi.mocked(createCalendarEvent).mock.calls[0][1];
    expect(input.startAt.toISOString()).toBe("2026-11-15T13:00:00.000Z");
    expect(input.endAt.toISOString()).toBe("2026-11-15T14:00:00.000Z");
  });
});
