import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/waterRepository", () => ({
  waterRepository: {
    findActiveGoal: vi.fn(),
    findRecentLogs: vi.fn(),
    findSlots: vi.fn(),
    replaceActiveGoal: vi.fn(),
    createLog: vi.fn(),
    deleteEntry: vi.fn(),
  },
}));

import { waterRepository } from "../infrastructure/waterRepository";
import { logWaterSchema, setWaterGoalSchema } from "./waterSchemas";
import { getWaterOverview, logWater, setWaterGoal } from "./waterUseCases";

describe("water use cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getWaterOverview reads the last 50 logs and adds the server time", async () => {
    vi.mocked(waterRepository.findActiveGoal).mockResolvedValue(null);
    vi.mocked(waterRepository.findRecentLogs).mockResolvedValue([]);
    vi.mocked(waterRepository.findSlots).mockResolvedValue([]);

    const overview = await getWaterOverview("u1");

    expect(waterRepository.findRecentLogs).toHaveBeenCalledWith("u1", 50);
    expect(overview).toMatchObject({ goal: null, logs: [], slots: [] });
    expect(typeof overview.serverTime).toBe("string");
  });

  it("setWaterGoal replaces the goal with hourly slots when none are chosen", async () => {
    await setWaterGoal("u1", { dailyTargetMl: 1500 });

    const [userId, target, slots] = vi.mocked(waterRepository.replaceActiveGoal).mock.calls[0];
    expect([userId, target]).toEqual(["u1", 1500]);
    expect(slots).toHaveLength(15);
  });

  it("logWater defaults loggedAt to now", async () => {
    const before = Date.now();
    await logWater("u1", { amountMl: 200 });

    const [, amount, loggedAt] = vi.mocked(waterRepository.createLog).mock.calls[0];
    expect(amount).toBe(200);
    expect(loggedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe("water schemas", () => {
  it("treats null slots and empty loggedAt as missing", () => {
    expect(setWaterGoalSchema.parse({ dailyTargetMl: "2000", slots: null })).toEqual({ dailyTargetMl: 2000 });
    expect(logWaterSchema.parse({ amountMl: 250, loggedAt: null })).toEqual({ amountMl: 250 });
  });

  it("rejects non-positive amounts", () => {
    expect(() => logWaterSchema.parse({ amountMl: "abc" })).toThrow();
    expect(() => logWaterSchema.parse({ amountMl: 0 })).toThrow();
  });
});
