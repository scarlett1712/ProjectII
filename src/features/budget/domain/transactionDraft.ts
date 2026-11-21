import type { TransactionKind } from "./balance";

/** Transaction fields validated before saving in the client form or API. */
export interface TransactionDraft {
  amount: number;
  type: TransactionKind;
  categoryId?: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
}

/** Error name mapped to budget.validation.<error> on the client and api.budget.transaction.<error> on the server. */
export type TransactionDraftError =
  | "invalidAmount"
  | "selectCategory"
  | "selectFromAccount"
  | "selectToAccount"
  | "selectTransferAccounts";

/**
 * Shared form and API rules. Return the first error in the original validation order, or null:
 * the amount must be positive. Income and expenses need a category. Expenses require a source, income a destination and transfers both.
 */
export function validateTransactionDraft(draft: TransactionDraft): TransactionDraftError | null {
  if (!(draft.amount > 0)) return "invalidAmount";
  if (draft.type !== "TRANSFER" && !draft.categoryId) return "selectCategory";
  if (draft.type === "EXPENSE" && !draft.fromAccountId) return "selectFromAccount";
  if (draft.type === "INCOME" && !draft.toAccountId) return "selectToAccount";
  if (draft.type === "TRANSFER" && (!draft.fromAccountId || !draft.toAccountId)) return "selectTransferAccounts";
  return null;
}
