import { describe, expect, it } from "vitest";
import { runningBalances } from "./runningBalances";

const tx = (id: string, type: "INCOME" | "EXPENSE" | "TRANSFER", amount: number, from: string | null, to: string | null, day: number) => ({
  id,
  type,
  amount,
  fromAccountId: from,
  toAccountId: to,
  occurredAt: new Date(Date.UTC(2026, 2, day)).toISOString(),
});

describe("runningBalances", () => {
  const accounts = [
    { id: "cash", balance: 999, startingBalance: 100 },
    { id: "bank", balance: 500 },
  ];

  it("applies transactions in time order from the starting balances", () => {
    const result = runningBalances(accounts, [
      tx("e1", "EXPENSE", 30, "cash", null, 3),
      tx("i1", "INCOME", 50, null, "cash", 1),
      tx("t1", "TRANSFER", 200, "bank", "cash", 2),
    ]);
    expect(result.get("i1")).toBe(150); // cash 100 + 50
    expect(result.get("t1")).toBe(300); // Bank balance: 500 - 200 (cash rises to 350).
    expect(result.get("e1")).toBe(320); // cash 350 - 30
  });

  it("falls back to the total balance for transactions without a known account", () => {
    const result = runningBalances(accounts, [tx("e1", "EXPENSE", 40, null, null, 1), tx("i1", "INCOME", 10, "x", "ghost", 2)]);
    expect(result.get("e1")).toBe(560); // Total: 600 - 40.
    expect(result.get("i1")).toBe(570);
  });

  it("orders same-time transactions by id", () => {
    const result = runningBalances(accounts, [tx("b", "EXPENSE", 10, "cash", null, 1), tx("a", "EXPENSE", 20, "cash", null, 1)]);
    expect(result.get("a")).toBe(80);
    expect(result.get("b")).toBe(70);
  });
});
