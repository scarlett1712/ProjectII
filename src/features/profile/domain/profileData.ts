import { calculateDailyCalories, normalizeActivityLevel, normalizeGender } from "./calorie";

/** Health data persisted to the Profile table. */
export interface ProfileData {
  gender: string | null;
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  activityLevel: string | null;
  dailyCalories: number | null;
}

export interface ProfileFormInput {
  gender?: string | null;
  activityLevel?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
}

/** Convert undefined, null and empty strings to null. For other values use Number(value), converting NaN to null. */
export function toOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Normalize missing form fields to null. Use zero for missing measurements in the daily calorie calculation
 * and save the result only when the activity level allows it to be computed.
 */
export function buildProfileData(input: ProfileFormInput): ProfileData {
  const weightKg = input.weightKg ?? null;
  const heightCm = input.heightCm ?? null;
  const age = input.age ?? null;

  const activityLevel = normalizeActivityLevel(input.activityLevel);
  const dailyCalories = activityLevel
    ? calculateDailyCalories({
        gender: normalizeGender(input.gender),
        weightKg: weightKg ?? 0,
        heightCm: heightCm ?? 0,
        age: age ?? 0,
        activityLevel,
      })
    : NaN;

  return {
    gender: input.gender || null,
    weightKg,
    heightCm,
    age,
    activityLevel: input.activityLevel || null,
    dailyCalories: Number.isNaN(dailyCalories) ? null : dailyCalories,
  };
}

export interface ProfileGoalsInput {
  /** "MALE" | "FEMALE" | "OTHER" (chatbot). */
  gender?: string;
  weightKg?: number;
  heightCm?: number;
  age?: number;
  activityLevel?: string;
}

/** Complete profile after applying defaults. */
export interface CompleteProfileData {
  gender: string;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: string;
  dailyCalories: number;
}

type ExistingProfile = Pick<ProfileData, "gender" | "weightKg" | "heightCm" | "age" | "activityLevel">;

export const PROFILE_DEFAULTS = {
  gender: "MALE",
  weightKg: 60,
  heightCm: 170,
  age: 25,
  activityLevel: "sedentary",
} as const;

/**
 * Merge new values with the existing profile, ignoring falsy updates and filling missing fields with PROFILE_DEFAULTS.
 * Then recalculate daily calories for the chatbot's profile update.
 */
export function mergeProfileForGoals(
  input: ProfileGoalsInput,
  existing: ExistingProfile | null,
): CompleteProfileData {
  const gender = input.gender || existing?.gender || PROFILE_DEFAULTS.gender;
  const weightKg = input.weightKg || existing?.weightKg || PROFILE_DEFAULTS.weightKg;
  const heightCm = input.heightCm || existing?.heightCm || PROFILE_DEFAULTS.heightCm;
  const age = input.age || existing?.age || PROFILE_DEFAULTS.age;
  // Ignore unknown activity levels from the chatbot to avoid a NaN calorie target.
  const activityLevel =
    normalizeActivityLevel(input.activityLevel) ??
    normalizeActivityLevel(existing?.activityLevel) ??
    PROFILE_DEFAULTS.activityLevel;

  const dailyCalories = calculateDailyCalories({
    gender: normalizeGender(gender),
    weightKg,
    heightCm,
    age,
    activityLevel,
  });

  // Store the uppercase form value such as SEDENTARY so the profile screen resolves the correct label.
  return { gender, weightKg, heightCm, age, activityLevel: activityLevel.toUpperCase(), dailyCalories };
}
