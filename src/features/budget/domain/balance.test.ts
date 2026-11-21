import { describe, expect, it } from "vitest";
import { balanceDeltas, combineDeltas, revertDeltas, withStartingBalances } from "./balance";

const entries = (deltas: Map<string, number>) => Object.fromEntries(deltas);

describe("balanceDeltas", () => {
  it("EXPENSE only debits the source account", () => {
    expect(entries(balanceDeltas({ type: "EXPENSE", amount: 50, fromAccountId: "a", toAccountId: "b" }))).toEqual({
      a: -50,
    });
  });

  it("INCOME only credits the destination account", () => {
    expect(entries(balanceDeltas({ type: "INCOME", amount: 70, fromAccountId: "a", toAccountId: "b" }))).toEqual({
      b: 70,
    });
  });

  it("TRANSFER moves money between both accounts", () => {
    expect(entries(balanceDeltas({ type: "TRANSFER", amount: 30, fromAccountId: "a", toAccountId: "b" }))).toEqual({
      a: -30,
      b: 30,
    });
  });

  it("does nothing when the relevant account is missing", () => {
    expect(balanceDeltas({ type: "EXPENSE", amount: 10, toAccountId: "b" }).size).toBe(0);
    expect(balanceDeltas({ type: "INCOME", amount: 10, fromAccountId: "a" }).size).toBe(0);
    expect(balanceDeltas({ type: "TRANSFER", amount: 10, fromAccountId: "a", toAccountId: null }).size).toBe(0);
  });

  it("a transfer to the same account nets to zero", () => {
    expect(entries(balanceDeltas({ type: "TRANSFER", amount: 10, fromAccountId: "a", toAccountId: "a" }))).toEqual({
      a: 0,
    });
  });
});

describe("revertDeltas / combineDeltas", () => {
  it("revert is the exact opposite of apply", () => {
    const tx = { type: "TRANSFER" as const, amount: 25, fromAccountId: "a", toAccountId: "b" };
    expect(entries(revertDeltas(tx))).toEqual({ a: 25, b: -25 });
    expect(entries(combineDeltas(balanceDeltas(tx), revertDeltas(tx)))).toEqual({ a: 0, b: 0 });
  });

  it("editing an expense into income on another account", () => {
    const old = { type: "EXPENSE" as const, amount: 100, fromAccountId: "a" };
    const next = { type: "INCOME" as const, amount: 40, toAccountId: "b" };
    expect(entries(combineDeltas(revertDeltas(old), balanceDeltas(next)))).toEqual({ a: 100, b: 40 });
  });
});

describe("withStartingBalances", () => {
  it("undoes every movement since the period start (balance - inflows + outflows)", () => {
    const accounts = [
      { id: "a", balance: 1000, name: "Ví" },
      { id: "b", balance: 500, name: "Bank" },
      { id: "c", balance: 0, name: "Unused" },
    ];
    const result = withStartingBalances(accounts, [
      { type: "EXPENSE", amount: 200, fromAccountId: "a", toAccountId: null },
      { type: "INCOME", amount: 300, fromAccountId: null, toAccountId: "a" },
      { type: "TRANSFER", amount: 100, fromAccountId: "a", toAccountId: "b" },
      { type: "INCOME", amount: 50, fromAccountId: "b", toAccountId: null },
    ]);

    expect(result.map((acc) => [acc.id, acc.startingBalance])).toEqual([
      ["a", 1000 - 300 + 200 + 100],
      ["b", 500 - 100],
      ["c", 0],
    ]);
    expect(result[0].name).toBe("Ví");
  });
});
