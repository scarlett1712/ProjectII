import { describe, expect, it } from "vitest";
import { cashflowByKey, dayKey, monthKey, sumCashflow } from "./cashflow";

const tx = (type: "INCOME" | "EXPENSE" | "TRANSFER", amount: number, occurredAt: Date) => ({ type, amount, occurredAt });

describe("cashflow", () => {
  it("sums income and expense, ignoring transfers", () => {
    expect(sumCashflow([tx("INCOME", 100, new Date()), tx("EXPENSE", 40, new Date()), tx("TRANSFER", 999, new Date())])).toEqual({
      income: 100,
      expense: 40,
    });
  });

  it("groups by local day/month and keeps every requested key", () => {
    const txs = [
      tx("INCOME", 100, new Date(2026, 2, 1, 1, 30)),
      tx("EXPENSE", 30, new Date(2026, 2, 1, 23, 0)),
      tx("EXPENSE", 5, new Date(2026, 1, 28, 12, 0)),
    ];
    expect(cashflowByKey(txs, ["2026-02-28", "2026-03-01", "2026-03-02"], dayKey)).toEqual([
      { key: "2026-02-28", income: 0, expense: 5 },
      { key: "2026-03-01", income: 100, expense: 30 },
      { key: "2026-03-02", income: 0, expense: 0 },
    ]);
    expect(cashflowByKey(txs, ["2026-03"], monthKey)).toEqual([{ key: "2026-03", income: 100, expense: 30 }]);
  });

  it("uses the local date, not the UTC date of an ISO string", () => {
    const local = new Date(2026, 2, 1, 0, 30);
    expect(dayKey(local.toISOString())).toBe("2026-03-01");
  });
});
