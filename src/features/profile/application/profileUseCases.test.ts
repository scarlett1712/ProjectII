import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/profileRepository", () => ({
  profileRepository: {
    findProfile: vi.fn(),
    findUserIdentity: vi.fn(),
    upsertProfile: vi.fn(),
    updateUserIdentity: vi.fn(),
    saveProfileWithIdentity: vi.fn(),
  },
}));
vi.mock("@/features/water/application/waterUseCases", () => ({ setWaterGoal: vi.fn() }));

import { setWaterGoal } from "@/features/water/application/waterUseCases";
import { recommendedDailyWaterMl } from "@/features/water/domain/reminderSlots";
import { profileRepository } from "../infrastructure/profileRepository";
import { updateProfileSchema } from "./profileSchemas";
import { getProfile, recalculateProfileGoals, updateProfile } from "./profileUseCases";

describe("profile use cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getProfile merges the health profile with the user's identity", async () => {
    vi.mocked(profileRepository.findProfile).mockResolvedValue(null);
    vi.mocked(profileRepository.findUserIdentity).mockResolvedValue({ name: "An", image: null, email: "a@b.c" });

    expect(await getProfile("u1")).toEqual({ name: "An", image: null, email: "a@b.c" });
  });

  it("updateProfile saves identity + profile and resets the water goal from weight", async () => {
    const input = updateProfileSchema.parse({
      name: "  An ",
      gender: "male",
      weightKg: "70",
      heightCm: 175,
      age: "25",
      activityLevel: "moderate",
    });
    await updateProfile("u1", input);

    expect(profileRepository.saveProfileWithIdentity).toHaveBeenCalledWith(
      "u1",
      { name: "An" },
      { gender: "male", weightKg: 70, heightCm: 175, age: 25, activityLevel: "moderate", dailyCalories: 2594 },
    );
    expect(setWaterGoal).toHaveBeenCalledWith("u1", { dailyTargetMl: recommendedDailyWaterMl(70) });
  });

  it("updateProfile with only an image updates identity without clearing health fields", async () => {
    await updateProfile("u1", updateProfileSchema.parse({ image: "" }));

    expect(profileRepository.updateUserIdentity).toHaveBeenCalledWith("u1", { image: null });
    expect(profileRepository.saveProfileWithIdentity).not.toHaveBeenCalled();
    expect(setWaterGoal).not.toHaveBeenCalled();
  });

  it("recalculateProfileGoals merges with the existing profile and sets the water goal", async () => {
    vi.mocked(profileRepository.findProfile).mockResolvedValue({ weightKg: 80, heightCm: 180, age: 30 } as never);

    const result = await recalculateProfileGoals("u1", { activityLevel: "very_active" });

    expect(profileRepository.upsertProfile).toHaveBeenCalledWith("u1", {
      gender: "MALE",
      weightKg: 80,
      heightCm: 180,
      age: 30,
      activityLevel: "VERY_ACTIVE",
      dailyCalories: 3382,
    });
    expect(result.dailyCalories).toBe(3382);
    expect(result.dailyTargetMl).toBe(recommendedDailyWaterMl(80));
    expect(setWaterGoal).toHaveBeenCalledWith("u1", { dailyTargetMl: result.dailyTargetMl });
  });
});

describe("updateProfileSchema", () => {
  it("normalises empty/invalid measurements to null and keeps absent identity fields undefined", () => {
    expect(updateProfileSchema.parse({ weightKg: "", heightCm: null, age: "abc" })).toEqual({
      weightKg: null,
      heightCm: null,
      age: null,
    });
    expect(updateProfileSchema.parse({ name: null, image: "data:x" })).toEqual({ name: "null", image: "data:x" });
  });
});
