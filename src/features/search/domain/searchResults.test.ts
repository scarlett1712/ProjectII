import { describe, expect, it } from "vitest";
import { searchResultLabels } from "../application/searchResultLabels";
import { normalizeSearchQuery, toSearchResults } from "./searchResults";

describe("normalizeSearchQuery", () => {
  it("returns null for empty or blank input", () => {
    expect(normalizeSearchQuery(null)).toBeNull();
    expect(normalizeSearchQuery("   ")).toBeNull();
  });

  it("trims and caps the query at 100 characters", () => {
    expect(normalizeSearchQuery("  cơm  ")).toBe("cơm");
    expect(normalizeSearchQuery("a".repeat(150))).toHaveLength(100);
  });
});

describe("toSearchResults", () => {
  it("maps each type in order with its label, link and description", () => {
    const results = toSearchResults({
      events: [],
      tasks: [{ id: "t1", title: "Học", completed: true }],
      meals: [{ id: "m1", mealName: "Phở", grams: 300, calories: 450 }],
      transactions: [
        { id: "b1", note: null, type: "EXPENSE", amount: 50000 },
        { id: "b2", note: "Lương", type: "INCOME", amount: 1000 },
      ],
    }, searchResultLabels());

    expect(results).toEqual([
      { id: "t1", title: "Học", type: "Nhiệm vụ", href: "/calendar", desc: "Đã xong" },
      { id: "m1", title: "Phở", type: "Măm măm", href: "/nutrition", desc: "300g - 450 kcal" },
      { id: "b1", title: "Giao dịch", type: "Xèng xèng", href: "/budget", desc: "-50000đ" },
      { id: "b2", title: "Lương", type: "Xèng xèng", href: "/budget", desc: "+1000đ" },
    ]);
  });
});
