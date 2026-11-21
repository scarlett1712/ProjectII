import { describe, expect, it } from "vitest";
import { categoryBudgetRows, sumCategoryBudget } from "./categoryBudget";

const categories = [
  { id: "food", type: "EXPENSE" as const, name: "Ăn" },
  { id: "salary", type: "INCOME" as const, name: "Lương" },
  { id: "fun", type: "EXPENSE" as const, name: "Chơi" },
];
const transactions = [
  { type: "EXPENSE" as const, amount: 30, categoryId: "food" },
  { type: "EXPENSE" as const, amount: 20, categoryId: "food" },
  { type: "INCOME" as const, amount: 500, categoryId: "salary" },
  // Exclude transactions whose type differs from their category.
  { type: "INCOME" as const, amount: 99, categoryId: "food" },
  { type: "TRANSFER" as const, amount: 10, categoryId: null },
];
const goals = [{ categoryId: "food", amount: 40 }];

describe("categoryBudgetRows", () => {
  it("keeps only categories of the kind, with planned, actual and diff", () => {
    expect(categoryBudgetRows(categories, transactions, goals, "EXPENSE")).toEqual([
      { id: "food", type: "EXPENSE", name: "Ăn", planned: 40, actual: 50, diff: 10 },
      { id: "fun", type: "EXPENSE", name: "Chơi", planned: 0, actual: 0, diff: 0 },
    ]);
    expect(categoryBudgetRows(categories, transactions, goals, "INCOME")).toEqual([
      { id: "salary", type: "INCOME", name: "Lương", planned: 0, actual: 500, diff: 500 },
    ]);
  });

  it("sums planned and actual", () => {
    expect(sumCategoryBudget(categoryBudgetRows(categories, transactions, goals, "EXPENSE"))).toEqual({ planned: 40, actual: 50 });
    expect(sumCategoryBudget([])).toEqual({ planned: 0, actual: 0 });
  });
});
