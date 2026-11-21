import { describe, expect, it } from "vitest";
import { buildHourlySlots, planReminderSlots, recommendedDailyWaterMl } from "./reminderSlots";

describe("buildHourlySlots", () => {
  it("creates one slot per hour from 08:00 to 22:00 by default", () => {
    const slots = buildHourlySlots(1500);
    expect(slots).toHaveLength(15);
    expect(slots[0]).toEqual({ slotTime: "08:00", amountMl: 100 });
    expect(slots.at(-1)?.slotTime).toBe("22:00");
  });

  it("always returns at least one slot", () => {
    expect(buildHourlySlots(500, 10, 9)).toEqual([{ slotTime: "10:00", amountMl: 500 }]);
  });
});

describe("planReminderSlots", () => {
  it("splits the target evenly across the chosen times", () => {
    expect(planReminderSlots(1000, ["09:00", "15:00", "21:00"])).toEqual([
      { slotTime: "09:00", amountMl: 333 },
      { slotTime: "15:00", amountMl: 333 },
      { slotTime: "21:00", amountMl: 333 },
    ]);
  });

  it("falls back to hourly slots when no time is chosen", () => {
    expect(planReminderSlots(1500, [])).toHaveLength(15);
  });
});

describe("recommendedDailyWaterMl", () => {
  it("uses 35 ml per kg", () => {
    expect(recommendedDailyWaterMl(60)).toBe(2100);
  });
});
