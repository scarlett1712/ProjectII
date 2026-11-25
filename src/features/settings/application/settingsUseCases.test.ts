import { describe, expect, it, vi } from "vitest";
import { DEFAULT_USER_SETTINGS, isWithinQuietHours } from "../domain/settingsTypes";

vi.mock("../infrastructure/settingsRepository", () => ({
  settingsRepository: {
    findByUserId: vi.fn(async () => null),
    upsert: vi.fn(async (_u, data) => ({ ...DEFAULT_USER_SETTINGS, ...data })),
  },
}));

import { getUserSettings, updateUserSettings } from "./settingsUseCases";

describe("settingsUseCases", () => {
  it("returns default settings when user has no record", async () => {
    const res = await getUserSettings("u1");
    expect(res).toEqual(DEFAULT_USER_SETTINGS);
  });

  it("updates partial settings", async () => {
    const res = await updateUserSettings("u1", { theme: "dark", starPersonality: "cool" });
    expect(res.theme).toBe("dark");
    expect(res.starPersonality).toBe("cool");
  });

  it("checks overnight quiet hours accurately", () => {
    const s = { quietHoursEnabled: true, quietStart: "23:00", quietEnd: "07:00" };
    expect(isWithinQuietHours(s, new Date(2026, 10, 25, 23, 30))).toBe(true);
    expect(isWithinQuietHours(s, new Date(2026, 10, 25, 6, 45))).toBe(true);
    expect(isWithinQuietHours(s, new Date(2026, 10, 25, 12, 0))).toBe(false);
  });
});
