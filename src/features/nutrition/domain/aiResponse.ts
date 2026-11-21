import type { CalorieEstimate } from "./calorieHeuristic";

export interface PortionOption {
  label: string;
  value: string;
}

export const DEFAULT_PORTIONS: PortionOption[] = [
  { label: "Khẩu phần nhỏ", value: "small" },
  { label: "Khẩu phần vừa", value: "medium" },
  { label: "Khẩu phần lớn", value: "large" },
];

/**
 * Extract calories and explanation from the first JSON block in the AI response.
 * If the block is missing or invalid, return zero calories to trigger the caller's fallback.
 */
export function parseCalorieEstimate(text: string): CalorieEstimate {
  try {
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { calories?: unknown; explanation?: unknown };
      return {
        calories: Number(parsed.calories) || 0,
        explanation: (parsed.explanation || "") as string,
      };
    }
  } catch (e) {
    console.error("Failed to parse AI calorie estimation:", e);
  }
  return { calories: 0, explanation: "" };
}

/** Extract three portions from the AI response, returning DEFAULT_PORTIONS for invalid output. */
export function parsePortionSuggestions(text: string): PortionOption[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const parsed: unknown = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length === 3) {
        return parsed as PortionOption[];
      }
    }
  } catch (e) {
    console.error("Failed to parse AI portion suggestion:", e);
  }
  return DEFAULT_PORTIONS;
}
