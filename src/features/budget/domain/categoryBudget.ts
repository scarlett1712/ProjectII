import type { CategoryKind, TransactionKind } from "./balance";

export interface BudgetCategory {
  id: string;
  type: CategoryKind;
}

export interface BudgetGoal {
  categoryId: string;
  amount: number;
}

export interface CategorizedTransaction {
  type: TransactionKind;
  amount: number;
  categoryId: string | null;
}

/** Monthly category row with its target, actual amount and variance (actual minus planned). */
export type CategoryBudgetRow<C extends BudgetCategory> = C & { planned: number; actual: number; diff: number };

/** Categories of the requested kind in their original order, with the planned target (default zero) and actual total for that type. */
export function categoryBudgetRows<C extends BudgetCategory>(
  categories: readonly C[],
  transactions: readonly CategorizedTransaction[],
  goals: readonly BudgetGoal[],
  kind: CategoryKind,
): CategoryBudgetRow<C>[] {
  return categories
    .filter((category) => category.type === kind)
    .map((category) => {
      const actual = transactions
        .filter((tx) => tx.categoryId === category.id && tx.type === kind)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const planned = goals.find((goal) => goal.categoryId === category.id)?.amount || 0;
      return { ...category, planned, actual, diff: actual - planned };
    });
}

/** Sum planned and actual amounts across rows. */
export function sumCategoryBudget(rows: readonly { planned: number; actual: number }[]) {
  return rows.reduce((totals, row) => ({ planned: totals.planned + row.planned, actual: totals.actual + row.actual }), {
    planned: 0,
    actual: 0,
  });
}
