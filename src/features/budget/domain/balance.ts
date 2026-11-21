export const TRANSACTION_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
export type TransactionKind = (typeof TRANSACTION_TYPES)[number];
/** Only income and expenses have categories. Transfers have none. */
export type CategoryKind = Exclude<TransactionKind, "TRANSFER">;

/** Transaction fields that determine which account balances change. */
export interface BalanceMovement {
  type: TransactionKind;
  amount: number;
  fromAccountId?: string | null;
  toAccountId?: string | null;
}

/** Signed balance change per account, keyed by accountId. */
export type BalanceDeltas = Map<string, number>;

function addDelta(deltas: BalanceDeltas, accountId: string, delta: number) {
  deltas.set(accountId, (deltas.get(accountId) ?? 0) + delta);
}

/**
 * How each transaction type affects balances:
 * - EXPENSE subtracts from the source account when present.
 * - INCOME adds to the destination account when present.
 * - TRANSFER debits the source and credits the destination when both are present.
 * Ignore account IDs unrelated to the transaction type.
 */
export function balanceDeltas(movement: BalanceMovement): BalanceDeltas {
  const deltas: BalanceDeltas = new Map();
  const { type, amount, fromAccountId, toAccountId } = movement;
  if (type === "EXPENSE" && fromAccountId) {
    addDelta(deltas, fromAccountId, -amount);
  } else if (type === "INCOME" && toAccountId) {
    addDelta(deltas, toAccountId, amount);
  } else if (type === "TRANSFER" && fromAccountId && toAccountId) {
    addDelta(deltas, fromAccountId, -amount);
    addDelta(deltas, toAccountId, amount);
  }
  return deltas;
}

/** Reverse balance changes when deleting or editing an existing transaction. */
export function revertDeltas(movement: BalanceMovement): BalanceDeltas {
  const deltas: BalanceDeltas = new Map();
  for (const [accountId, delta] of balanceDeltas(movement)) addDelta(deltas, accountId, -delta);
  return deltas;
}

/** Combine balance changes, for example when reversing the old transaction and applying its replacement. */
export function combineDeltas(...sets: BalanceDeltas[]): BalanceDeltas {
  const deltas: BalanceDeltas = new Map();
  for (const set of sets) {
    for (const [accountId, delta] of set) addDelta(deltas, accountId, delta);
  }
  return deltas;
}

/**
 * Compute each account's opening balance by reversing all transactions since the start of the period
 * from its current balance (balance minus inflows plus outflows).
 */
export function withStartingBalances<A extends { id: string; balance: number }>(
  accounts: A[],
  movementsSinceStart: BalanceMovement[],
): (A & { startingBalance: number })[] {
  const netChange = combineDeltas(...movementsSinceStart.map(balanceDeltas));
  return accounts.map((account) => ({
    ...account,
    startingBalance: account.balance - (netChange.get(account.id) ?? 0),
  }));
}
