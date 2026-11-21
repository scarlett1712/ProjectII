import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PORTIONS, parseCalorieEstimate, parsePortionSuggestions } from "./aiResponse";
import { estimateCaloriesHeuristically } from "./calorieHeuristic";

describe("estimateCaloriesHeuristically", () => {
  it("sums carb, protein, cooking style and veggies for a medium portion", () => {
    // Rice (220), beef (200), braising (70) and chayote (40) total 530.
    expect(estimateCaloriesHeuristically("Cơm bò kho su su", "1 bát vừa", "medium").calories).toBe(530);
  });

  it("uses the generic base when nothing matches", () => {
    const result = estimateCaloriesHeuristically("Pizza", "1 lát", undefined);
    expect(result.calories).toBe(350);
    expect(result.explanation).toBe("Star ước lượng dựa trên thành phần thực phẩm là khoảng 350 kcal nha! ✨");
  });

  it("applies the small multiplier from portion value or label", () => {
    expect(estimateCaloriesHeuristically("Phở", "x", "small").calories).toBe(210);
    expect(estimateCaloriesHeuristically("Phở", "Bát nhỏ", "medium").calories).toBe(210);
  });

  it("applies the large multiplier", () => {
    expect(estimateCaloriesHeuristically("Phở", "Bát lớn", null).calories).toBe(405);
  });
});

describe("parseCalorieEstimate", () => {
  it("reads the first JSON object in the text", () => {
    expect(parseCalorieEstimate('Đây nè: {"calories": "450", "explanation": "Star nói ✨"} xong')).toEqual({
      calories: 450,
      explanation: "Star nói ✨",
    });
  });

  it("returns 0 calories when there is no JSON or it is malformed", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parseCalorieEstimate("không có gì")).toEqual({ calories: 0, explanation: "" });
    expect(parseCalorieEstimate("{calories: 1}")).toEqual({ calories: 0, explanation: "" });
    expect(parseCalorieEstimate('{"calories": "abc"}')).toEqual({ calories: 0, explanation: "" });
  });
});

describe("parsePortionSuggestions", () => {
  it("accepts an array of exactly three portions", () => {
    const portions = [
      { label: "a", value: "small" },
      { label: "b", value: "medium" },
      { label: "c", value: "large" },
    ];
    expect(parsePortionSuggestions(`\`\`\`json\n${JSON.stringify(portions)}\n\`\`\``)).toEqual(portions);
  });

  it("falls back to defaults for wrong length or malformed JSON", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parsePortionSuggestions('[{"label":"a","value":"small"}]')).toBe(DEFAULT_PORTIONS);
    expect(parsePortionSuggestions("[oops]")).toBe(DEFAULT_PORTIONS);
    expect(parsePortionSuggestions("")).toBe(DEFAULT_PORTIONS);
  });
});
