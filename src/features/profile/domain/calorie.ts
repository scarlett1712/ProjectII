export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

const activityMap: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Normalize activity levels to activityMap keys. The web form sends uppercase values and the chatbot sends lowercase.
 * Return null for unknown values.
 */
export function normalizeActivityLevel(value: string | null | undefined): ActivityLevel | null {
  const key = value?.trim().toLowerCase();
  return key && key in activityMap ? (key as ActivityLevel) : null;
}

/** Normalize MALE or male to male. FEMALE, OTHER and empty values use the female formula as before. */
export function normalizeGender(value: string | null | undefined): "male" | "female" {
  return value?.trim().toLowerCase() === "male" ? "male" : "female";
}

export function calculateDailyCalories(input: {
  gender: "male" | "female";
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
}) {
  const { gender, weightKg, heightCm, age, activityLevel } = input;
  const bmr =
    gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  return Math.round(bmr * activityMap[activityLevel]);
}
