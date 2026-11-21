import type { TransactionKind } from "./balance";

export interface RunningBalanceAccount {
  id: string;
  balance: number;
  /** Opening balance for the selected month. Fall back to balance when unavailable. */
  startingBalance?: number;
}

export interface RunningBalanceTransaction {
  id: string;
  type: TransactionKind;
  amount: number;
  fromAccountId: string | null;
  toAccountId: string | null;
  occurredAt: string | Date;
}

/**
 * Calculate running balances from the opening balance in chronological order, breaking timestamp ties by ID.
 * Each entry holds the balance of the relevant account: the destination for income and the source for
 * expenses and transfers. For transactions without an account, use the combined balance of all accounts.
 */
export function runningBalances(
  accounts: readonly RunningBalanceAccount[],
  transactions: readonly RunningBalanceTransaction[],
): Map<string, number> {
  const balanceOf = new Map(accounts.map((acc) => [acc.id, acc.startingBalance ?? acc.balance]));
  let total = [...balanceOf.values()].reduce((sum, value) => sum + value, 0);

  const add = (accountId: string | null, delta: number): number | null => {
    if (!accountId || !balanceOf.has(accountId)) return null;
    const next = balanceOf.get(accountId)! + delta;
    balanceOf.set(accountId, next);
    return next;
  };

  const ordered = [...transactions].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime() || a.id.localeCompare(b.id),
  );

  const result = new Map<string, number>();
  for (const tx of ordered) {
    let accountBalance: number | null = null;
    if (tx.type === "INCOME") {
      accountBalance = add(tx.toAccountId, tx.amount);
      total += tx.amount;
    } else if (tx.type === "EXPENSE") {
      accountBalance = add(tx.fromAccountId, -tx.amount);
      total -= tx.amount;
    } else {
      accountBalance = add(tx.fromAccountId, -tx.amount);
      add(tx.toAccountId, tx.amount);
    }
    result.set(tx.id, accountBalance ?? total);
  }
  return result;
}
