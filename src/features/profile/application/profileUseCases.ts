import { setWaterGoal } from "@/features/water/application/waterUseCases";
import { recommendedDailyWaterMl } from "@/features/water/domain/reminderSlots";
import { buildProfileData, mergeProfileForGoals, type ProfileGoalsInput } from "../domain/profileData";
import { profileRepository, type UserIdentityUpdate } from "../infrastructure/profileRepository";
import type { UpdateProfileInput } from "./profileSchemas";

/** Health profile with the user's name, image and email for the profile screen. */
export async function getProfile(userId: string) {
  const [profile, user] = await Promise.all([
    profileRepository.findProfile(userId),
    profileRepository.findUserIdentity(userId),
  ]);
  return { ...profile, name: user?.name, image: user?.image, email: user?.email };
}

/** Health profile only, or null if missing, for the chatbot's get_profile tool. */
export function getHealthProfile(userId: string) {
  return profileRepository.findProfile(userId);
}

/**
 * Save all health fields, using null for missing values, recalculate daily calories
 * and reset the water target when weight is positive.
 */
export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const identity: UserIdentityUpdate = {};
  if (input.name !== undefined) identity.name = input.name;
  if (input.image !== undefined) identity.image = input.image;

  const data = buildProfileData(input);
  const profile = await profileRepository.saveProfileWithIdentity(userId, identity, data);

  if (data.weightKg !== null && data.weightKg > 0) {
    await setWaterGoal(userId, { dailyTargetMl: recommendedDailyWaterMl(data.weightKg) });
  }
  return profile;
}

/**
 * Merge new measurements with the existing profile and defaults, save it and set the new water target.
 * (chatbot `update_profile_and_recalculate_goals`).
 */
export async function recalculateProfileGoals(userId: string, input: ProfileGoalsInput) {
  const existing = await profileRepository.findProfile(userId);
  const data = mergeProfileForGoals(input, existing);
  const profile = await profileRepository.upsertProfile(userId, data);

  const dailyTargetMl = recommendedDailyWaterMl(data.weightKg);
  await setWaterGoal(userId, { dailyTargetMl });

  return { profile, dailyCalories: data.dailyCalories, dailyTargetMl };
}
