import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@/shared/application/errors";

const scope = {
  findAccount: vi.fn(),
  findCategory: vi.fn(),
  findTransaction: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  applyBalanceDeltas: vi.fn(),
};

vi.mock("../infrastructure/budgetRepository", () => ({
  budgetRepository: {
    inTransaction: vi.fn((_userId: string, work: (s: typeof scope) => unknown) => work(scope)),
    listAccounts: vi.fn(),
    listBalanceMovementsSince: vi.fn(),
    findAccountByName: vi.fn(),
    createAccount: vi.fn(),
    findCategoryByName: vi.fn(),
    findCategory: vi.fn(),
    createCategory: vi.fn(),
    upsertGoal: vi.fn(),
  },
}));

import { budgetRepository } from "../infrastructure/budgetRepository";
import {
  createAccountSchema,
  createCategorySchema,
  createTransactionSchema,
  goalPeriodSchema,
  updateAccountSchema,
  updateCategorySchema,
  updateTransactionSchema,
  upsertGoalSchema,
} from "./budgetSchemas";
import {
  upsertGoal,
  createCategory,
  createTransaction,
  deleteTransaction,
  findOrCreateAccountByName,
  listAccounts,
  updateTransaction,
} from "./budgetUseCases";

const appliedDeltas = () => Object.fromEntries(scope.applyBalanceDeltas.mock.calls[0][0] as Map<string, number>);

describe("createTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scope.findAccount.mockResolvedValue({ id: "acc" });
    scope.findCategory.mockResolvedValue({ id: "cat" });
    scope.createTransaction.mockImplementation(async (data) => ({ id: "t1", ...data }));
  });

  it("creates the record and debits the source account for an expense", async () => {
    const result = await createTransaction("u1", { amount: 50, type: "EXPENSE", fromAccountId: "a", categoryId: "c" });

    expect(budgetRepository.inTransaction).toHaveBeenCalledWith("u1", expect.any(Function));
    expect(scope.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50, type: "EXPENSE", fromAccountId: "a", toAccountId: null, note: null }),
    );
    expect(appliedDeltas()).toEqual({ a: -50 });
    expect(result).toMatchObject({ id: "t1" });
  });

  it.each([
    ["fromAccountId", "budget.transaction.fromAccountNotOwned"],
    ["toAccountId", "budget.transaction.toAccountNotOwned"],
  ])("rejects a foreign %s with a 404 and its error code", async (field, code) => {
    scope.findAccount.mockImplementation(async (id: string) => (id === "foreign" ? null : { id }));

    const promise = createTransaction("u1", { amount: 10, type: "TRANSFER", fromAccountId: "a", toAccountId: "b", [field]: "foreign" });

    await expect(promise).rejects.toMatchObject({ status: 404, code });
    await expect(promise).rejects.toBeInstanceOf(HttpError);
    expect(scope.createTransaction).not.toHaveBeenCalled();
    expect(scope.applyBalanceDeltas).not.toHaveBeenCalled();
  });

  it("rejects a foreign category", async () => {
    scope.findCategory.mockResolvedValue(null);

    await expect(createTransaction("u1", { amount: 10, type: "INCOME", toAccountId: "b", categoryId: "x" })).rejects.toMatchObject({
      status: 404,
      code: "budget.transaction.categoryNotOwned",
    });
    expect(scope.createTransaction).not.toHaveBeenCalled();
  });

  it("skips ownership checks for omitted references", async () => {
    await createTransaction("u1", { amount: 10, type: "INCOME" });

    expect(scope.findAccount).not.toHaveBeenCalled();
    expect(scope.findCategory).not.toHaveBeenCalled();
    expect(appliedDeltas()).toEqual({});
  });
});

describe("updateTransaction / deleteTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scope.findAccount.mockResolvedValue({ id: "acc" });
    scope.findCategory.mockResolvedValue({ id: "cat" });
  });

  it("reverts the old effect, applies the new one and drops links that do not fit the new type", async () => {
    scope.findTransaction.mockResolvedValue({ type: "EXPENSE", amount: 100, fromAccountId: "a", toAccountId: null });

    await updateTransaction("u1", { id: "t1", amount: 40, type: "INCOME", fromAccountId: "a", toAccountId: "b", categoryId: "c" });

    expect(appliedDeltas()).toEqual({ a: 100, b: 40 });
    expect(scope.updateTransaction).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({ type: "INCOME", fromAccountId: null, toAccountId: "b", categoryId: "c" }),
    );
  });

  it("update rejects a transaction the user does not own", async () => {
    scope.findTransaction.mockResolvedValue(null);

    await expect(updateTransaction("u1", { id: "t1", amount: 1, type: "EXPENSE" })).rejects.toMatchObject({
      status: 404,
      code: "budget.transaction.notFoundOrNotOwned",
    });
  });

  it("delete reverts the balance before removing the record", async () => {
    scope.findTransaction.mockResolvedValue({ type: "TRANSFER", amount: 30, fromAccountId: "a", toAccountId: "b" });

    await deleteTransaction("u1", "t1");

    expect(appliedDeltas()).toEqual({ a: 30, b: -30 });
    expect(scope.deleteTransaction).toHaveBeenCalledWith("t1");
  });

  it("delete rejects a transaction the user does not own", async () => {
    scope.findTransaction.mockResolvedValue(null);

    await expect(deleteTransaction("u1", "t1")).rejects.toMatchObject({
      status: 404,
      code: "budget.transaction.notFoundOrCannotDelete",
    });
    expect(scope.deleteTransaction).not.toHaveBeenCalled();
  });
});

describe("accounts and categories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listAccounts without a period uses the current balance as starting balance", async () => {
    vi.mocked(budgetRepository.listAccounts).mockResolvedValue([{ id: "a", balance: 10 }] as never);

    expect(await listAccounts("u1")).toEqual([{ id: "a", balance: 10, startingBalance: 10 }]);
    expect(budgetRepository.listBalanceMovementsSince).not.toHaveBeenCalled();
  });

  it("listAccounts with a period undoes movements since the month start", async () => {
    vi.mocked(budgetRepository.listAccounts).mockResolvedValue([{ id: "a", balance: 10 }] as never);
    vi.mocked(budgetRepository.listBalanceMovementsSince).mockResolvedValue([
      { type: "EXPENSE", amount: 5, fromAccountId: "a", toAccountId: null },
    ]);

    expect(await listAccounts("u1", { year: 2026, month: 3 })).toEqual([{ id: "a", balance: 10, startingBalance: 15 }]);
    // Start of March 2026 in Vietnam (midnight UTC+07:00).
    expect(budgetRepository.listBalanceMovementsSince).toHaveBeenCalledWith("u1", new Date("2026-02-28T17:00:00Z"));
  });

  it("findOrCreateAccountByName reuses an existing account", async () => {
    vi.mocked(budgetRepository.findAccountByName).mockResolvedValue({ id: "a" } as never);

    expect(await findOrCreateAccountByName("u1", "ví")).toEqual({ id: "a" });
    expect(budgetRepository.createAccount).not.toHaveBeenCalled();
  });

  it("findOrCreateAccountByName creates a zero-balance account when missing", async () => {
    vi.mocked(budgetRepository.findAccountByName).mockResolvedValue(null);

    await findOrCreateAccountByName("u1", "Ví");
    expect(budgetRepository.createAccount).toHaveBeenCalledWith("u1", { name: "Ví", balance: 0, color: "#A172FD" });
  });

  it("createCategory rejects a duplicate name of the same type", async () => {
    vi.mocked(budgetRepository.findCategoryByName).mockResolvedValue({ id: "c" } as never);

    await expect(createCategory("u1", { name: "Ăn", type: "EXPENSE", color: "#fff" })).rejects.toMatchObject({
      status: 400,
      code: "budget.category.alreadyExists",
    });
  });
});

describe("transaction schemas", () => {
  const firstMessage = (fn: () => unknown) => {
    try {
      fn();
    } catch (error) {
      return (error as { issues: { message: string }[] }).issues[0].message;
    }
  };

  it("reports missing amount/type before anything else", () => {
    expect(firstMessage(() => createTransactionSchema.parse({ amount: "abc" }))).toBe("budget.transaction.amountAndTypeRequired");
    expect(firstMessage(() => createTransactionSchema.parse({ amount: 0, type: "EXPENSE" }))).toBe(
      "budget.transaction.amountAndTypeRequired",
    );
    expect(firstMessage(() => updateTransactionSchema.parse({ amount: 5, type: "EXPENSE" }))).toBe("budget.transaction.missingUpdateFields");
  });

  it("rejects invalid amounts and types", () => {
    expect(firstMessage(() => createTransactionSchema.parse({ amount: "-5", type: "EXPENSE" }))).toBe("budget.transaction.invalidAmount");
    expect(firstMessage(() => createTransactionSchema.parse({ amount: "abc", type: "EXPENSE" }))).toBe("budget.transaction.invalidAmount");
    expect(firstMessage(() => createTransactionSchema.parse({ amount: 5, type: "GIFT" }))).toBe("budget.transaction.invalidType");
  });

  it("treats empty optional fields as missing", () => {
    expect(
      createTransactionSchema.parse({ amount: "12.5", type: "TRANSFER", categoryId: "", fromAccountId: "a", toAccountId: "b", note: "", occurredAt: "" }),
    ).toEqual({ amount: 12.5, type: "TRANSFER", fromAccountId: "a", toAccountId: "b" });
  });

  it("applies the client form rules for category and accounts", () => {
    expect(firstMessage(() => createTransactionSchema.parse({ amount: 5, type: "EXPENSE", categoryId: "", fromAccountId: "a" }))).toBe(
      "budget.transaction.selectCategory",
    );
    expect(firstMessage(() => createTransactionSchema.parse({ amount: 5, type: "EXPENSE", categoryId: "c" }))).toBe(
      "budget.transaction.selectFromAccount",
    );
    expect(firstMessage(() => updateTransactionSchema.parse({ id: "t", amount: 5, type: "INCOME", categoryId: "c" }))).toBe(
      "budget.transaction.selectToAccount",
    );
    expect(firstMessage(() => updateTransactionSchema.parse({ id: "t", amount: 5, type: "TRANSFER", fromAccountId: "a" }))).toBe(
      "budget.transaction.selectTransferAccounts",
    );
    expect(createTransactionSchema.parse({ amount: 5, type: "INCOME", categoryId: "c", toAccountId: "b" })).toEqual({
      amount: 5,
      type: "INCOME",
      categoryId: "c",
      toAccountId: "b",
    });
  });
});

describe("account / category / goal schemas", () => {
  it("applies legacy defaults", () => {
    expect(createAccountSchema.parse({ name: " Ví ", balance: "" })).toEqual({ name: "Ví", balance: 0, color: "#A172FD" });
    expect(updateAccountSchema.parse({ id: "a", balance: "20" })).toEqual({ id: "a", balance: 20 });
    expect(goalPeriodSchema.parse({ year: "2026", month: "3" })).toEqual({ year: 2026, month: 3 });
  });

  it("keeps legacy error codes", () => {
    expect(() => createAccountSchema.parse({ name: "" })).toThrow("budget.account.nameRequired");
    expect(() => createCategorySchema.parse({ type: "TRANSFER" })).toThrow("budget.category.missingNameOrType");
    expect(() => createCategorySchema.parse({ name: "x", type: "TRANSFER" })).toThrow("budget.transaction.invalidType");
    expect(() => updateCategorySchema.parse({ id: "c" })).toThrow("budget.category.missingIdOrName");
    expect(() => goalPeriodSchema.parse({ year: "abc", month: 1 })).toThrow("budget.invalidPeriod");
    expect(() => upsertGoalSchema.parse({ categoryId: "c", amount: 5, month: 1 })).toThrow("budget.goal.missingData");
  });
});

it("updateCategorySchema leaves color undefined when omitted", () => {
  expect(updateCategorySchema.parse({ id: "c", name: " Ăn " })).toEqual({ id: "c", name: "Ăn", color: undefined });
});

describe("upsertGoal", () => {
  it("rejects a category that does not belong to the user", async () => {
    vi.mocked(budgetRepository.findCategory).mockResolvedValueOnce(null);
    await expect(upsertGoal("u1", { categoryId: "other", amount: 10, year: 2026, month: 3 })).rejects.toMatchObject({ status: 404 });
    expect(budgetRepository.upsertGoal).not.toHaveBeenCalled();
  });

  it("saves the goal for an owned category", async () => {
    vi.mocked(budgetRepository.findCategory).mockResolvedValueOnce({ id: "c1" } as never);
    await upsertGoal("u1", { categoryId: "c1", amount: 10, year: 2026, month: 3 });
    expect(budgetRepository.upsertGoal).toHaveBeenCalledWith("u1", { categoryId: "c1", amount: 10, year: 2026, month: 3 });
  });
});

describe("periodQuerySchema", () => {
  it("accepts an empty query and valid year/month", async () => {
    const { periodQuerySchema } = await import("./budgetSchemas");
    expect(periodQuerySchema.parse({ year: null, month: null })).toEqual({ year: undefined, month: undefined });
    expect(periodQuerySchema.parse({ year: "2026", month: "12" })).toEqual({ year: 2026, month: 12 });
    expect(periodQuerySchema.parse({ year: "2026", month: "" })).toEqual({ year: 2026, month: undefined });
  });

  it("rejects out-of-range values and a month without a year", async () => {
    const { periodQuerySchema } = await import("./budgetSchemas");
    expect(() => periodQuerySchema.parse({ year: "2026", month: "13" })).toThrow("budget.invalidMonth");
    expect(() => periodQuerySchema.parse({ year: "26", month: "1" })).toThrow("budget.invalidYear");
    expect(() => periodQuerySchema.parse({ year: null, month: "3" })).toThrow("budget.invalidYear");
    expect(() => goalPeriodSchema.parse({ year: "2026", month: "0" })).toThrow("budget.invalidPeriod");
  });
});
