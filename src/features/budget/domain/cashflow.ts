import { toDateInputValue } from "@/shared/domain/time";
import type { TransactionKind } from "./balance";

export interface CashflowTransaction {
  type: TransactionKind;
  amount: number;
  occurredAt: string | Date;
}

export interface CashflowTotals {
  income: number;
  expense: number;
}

/** Local calendar day as yyyy-MM-dd, using the user's time zone instead of the UTC date from an ISO string. */
export const dayKey = (date: string | Date) => toDateInputValue(date);
/** Local calendar month as yyyy-MM. */
export const monthKey = (date: string | Date) => toDateInputValue(date).slice(0, 7);

/** Total income and expenses, excluding transfers. */
export function sumCashflow(transactions: readonly CashflowTransaction[]): CashflowTotals {
  return transactions.reduce<CashflowTotals>(
    (totals, tx) => {
      if (tx.type === "INCOME") totals.income += tx.amount;
      if (tx.type === "EXPENSE") totals.expense += tx.amount;
      return totals;
    },
    { income: 0, expense: 0 },
  );
}

/**
 * Group transactions with keyOf and sum income and expenses for each requested key in order
 * (for example, dayKey or monthKey). Keys without transactions have zero totals.
 */
export function cashflowByKey(
  transactions: readonly CashflowTransaction[],
  keys: readonly string[],
  keyOf: (date: string | Date) => string,
): (CashflowTotals & { key: string })[] {
  const byKey = new Map(keys.map((key) => [key, { income: 0, expense: 0 }]));
  for (const tx of transactions) {
    const totals = byKey.get(keyOf(tx.occurredAt));
    if (!totals) continue;
    if (tx.type === "INCOME") totals.income += tx.amount;
    if (tx.type === "EXPENSE") totals.expense += tx.amount;
  }
  return keys.map((key) => ({ key, ...byKey.get(key)! }));
}
