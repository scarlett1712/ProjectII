import { describe, expect, it } from "vitest";
import { validateTransactionDraft } from "./transactionDraft";

describe("validateTransactionDraft", () => {
  it("rejects non-positive or non-numeric amounts first", () => {
    expect(validateTransactionDraft({ amount: 0, type: "EXPENSE" })).toBe("invalidAmount");
    expect(validateTransactionDraft({ amount: -5, type: "INCOME" })).toBe("invalidAmount");
    expect(validateTransactionDraft({ amount: NaN, type: "TRANSFER" })).toBe("invalidAmount");
  });

  it("requires a category and the matching account for income/expense", () => {
    expect(validateTransactionDraft({ amount: 10, type: "EXPENSE", fromAccountId: "a" })).toBe("selectCategory");
    expect(validateTransactionDraft({ amount: 10, type: "EXPENSE", categoryId: "c", toAccountId: "b" })).toBe("selectFromAccount");
    expect(validateTransactionDraft({ amount: 10, type: "INCOME", categoryId: "c", fromAccountId: "a" })).toBe("selectToAccount");
    expect(validateTransactionDraft({ amount: 10, type: "EXPENSE", categoryId: "c", fromAccountId: "a" })).toBeNull();
    expect(validateTransactionDraft({ amount: 10, type: "INCOME", categoryId: "c", toAccountId: "b" })).toBeNull();
  });

  it("requires both accounts for a transfer but no category", () => {
    expect(validateTransactionDraft({ amount: 10, type: "TRANSFER", fromAccountId: "a" })).toBe("selectTransferAccounts");
    expect(validateTransactionDraft({ amount: 10, type: "TRANSFER", toAccountId: "b", categoryId: "" })).toBe("selectTransferAccounts");
    expect(validateTransactionDraft({ amount: 10, type: "TRANSFER", fromAccountId: "a", toAccountId: "b" })).toBeNull();
  });
});
