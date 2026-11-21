import { describe, expect, it } from "vitest";
import { buildProfileData, mergeProfileForGoals, toOptionalNumber } from "./profileData";

describe("toOptionalNumber", () => {
  it("treats undefined, null, empty string and NaN as missing", () => {
    expect(toOptionalNumber(undefined)).toBeNull();
    expect(toOptionalNumber(null)).toBeNull();
    expect(toOptionalNumber("")).toBeNull();
    expect(toOptionalNumber("abc")).toBeNull();
  });

  it("converts numeric values like Number()", () => {
    expect(toOptionalNumber("70.5")).toBe(70.5);
    expect(toOptionalNumber(0)).toBe(0);
    expect(toOptionalNumber("0")).toBe(0);
  });
});

describe("buildProfileData", () => {
  it("computes daily calories from a complete form", () => {
    expect(
      buildProfileData({ gender: "male", weightKg: 70, heightCm: 175, age: 25, activityLevel: "moderate" }),
    ).toEqual({ gender: "male", weightKg: 70, heightCm: 175, age: 25, activityLevel: "moderate", dailyCalories: 2594 });
  });

  it("stores missing fields as null and skips calories for unknown activity", () => {
    expect(buildProfileData({ weightKg: null })).toEqual({
      gender: null,
      weightKg: null,
      heightCm: null,
      age: null,
      activityLevel: null,
      dailyCalories: null,
    });
  });

  it("uses 0 for missing measurements when activity is known (female formula for non-male)", () => {
    // BMR = -161, * 1.2 = -193.2 → -193
    expect(buildProfileData({ gender: "", activityLevel: "sedentary" }).dailyCalories).toBe(-193);
  });
});

describe("mergeProfileForGoals", () => {
  it("falls back to defaults when nothing is known", () => {
    expect(mergeProfileForGoals({}, null)).toEqual({
      gender: "MALE",
      weightKg: 60,
      heightCm: 170,
      age: 25,
      activityLevel: "SEDENTARY",
      // BMR = 600 + 1062.5 - 125 + 5 = 1542.5, * 1.2 = 1851
      dailyCalories: 1851,
    });
  });

  it("prefers new values, then existing ones", () => {
    const merged = mergeProfileForGoals(
      { weightKg: 50, gender: "FEMALE" },
      { gender: "MALE", weightKg: 80, heightCm: 160, age: 22, activityLevel: null },
    );
    expect(merged).toMatchObject({ gender: "FEMALE", weightKg: 50, heightCm: 160, age: 22, activityLevel: "SEDENTARY" });
    // BMR = 500 + 1000 - 110 - 161 = 1229, * 1.2 = 1475
    expect(merged.dailyCalories).toBe(1475);
  });
});

describe("profile data from the web form (uppercase values)", () => {
  it("computes calories for MALE / MODERATE like the lowercase form", async () => {
    const { buildProfileData } = await import("./profileData");
    const data = buildProfileData({ gender: "MALE", weightKg: 70, heightCm: 175, age: 25, activityLevel: "MODERATE" });
    expect(data.dailyCalories).toBe(2594);
    expect(data.activityLevel).toBe("MODERATE");
  });

  it("ignores an unknown activity level from the chatbot instead of producing NaN", async () => {
    const { mergeProfileForGoals } = await import("./profileData");
    const merged = mergeProfileForGoals({ activityLevel: "couch" }, null);
    expect(merged.activityLevel).toBe("SEDENTARY");
    expect(Number.isNaN(merged.dailyCalories)).toBe(false);
  });
});
