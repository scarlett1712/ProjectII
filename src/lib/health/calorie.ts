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
