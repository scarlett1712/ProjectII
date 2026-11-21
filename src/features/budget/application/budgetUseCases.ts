import { HttpError, badRequest, notFound } from "@/shared/application/errors";
import type { ApiMessageKey } from "@/shared/i18n/apiTranslator";
import { appMonthRange, appYearRange } from "@/shared/domain/time";
import { balanceDeltas, combineDeltas, revertDeltas, withStartingBalances, type CategoryKind } from "../domain/balance";
import {
  budgetRepository,
  type BudgetTransactionScope,
  type DateRange,
  type TransactionRecordData,
} from "../infrastructure/budgetRepository";
import type {
  CreateAccountInput,
  CreateCategoryInput,
  CreateTransactionInput,
  UpdateAccountInput,
  UpdateCategoryInput,
  UpdateTransactionInput,
  UpsertGoalInput,
} from "./budgetSchemas";
import { defaultColors } from "@/shared/theme/palettes";

const DEFAULT_COLOR = defaultColors.tag;

/** Return 404 for missing accounts, categories or transactions and for records owned by another user. */
const ownershipError = (code: ApiMessageKey) => new HttpError(404, code);

/** Compute months in Vietnam time. The server runs in UTC, so new Date(year, month) would use the wrong boundary. */
const monthRange = appMonthRange;

// ---------- Overview ----------

/** Monthly budget data, including each account's opening balance. */
export async function getBudgetOverview(userId: string, year: number, month: number) {
  const range = monthRange(year, month);
  const [accounts, categories, goals, transactions, movements] = await Promise.all([
    budgetRepository.listAccounts(userId),
    budgetRepository.listCategories(userId, "name"),
    budgetRepository.listGoals(userId, year, month),
    budgetRepository.listTransactions(userId, range),
    budgetRepository.listBalanceMovementsSince(userId, range.start),
  ]);
  return {
    accounts: withStartingBalances(accounts, movements),
    categories,
    goals,
    transactions,
  };
}

// ---------- Accounts ----------

/** List accounts with their opening balance for the given period, or their current balance when no period is supplied. */
export async function listAccounts(userId: string, period?: { year: number; month: number }) {
  const accounts = await budgetRepository.listAccounts(userId);
  if (!period) return accounts.map((account) => ({ ...account, startingBalance: account.balance }));

  const { start } = monthRange(period.year, period.month);
  const movements = await budgetRepository.listBalanceMovementsSince(userId, start);
  return withStartingBalances(accounts, movements);
}

export function createAccount(userId: string, input: CreateAccountInput) {
  return budgetRepository.createAccount(userId, input);
}

export function updateAccount(userId: string, id: string, input: UpdateAccountInput) {
  return budgetRepository.updateAccount(userId, id, input);
}

export function deleteAccount(userId: string, id: string) {
  return budgetRepository.deleteAccount(userId, id);
}

/** Find an account by case-insensitive name, creating it with a zero balance if needed. Used by the chatbot. */
export async function findOrCreateAccountByName(userId: string, name: string) {
  const existing = await budgetRepository.findAccountByName(userId, name);
  return existing ?? budgetRepository.createAccount(userId, { name, balance: 0, color: DEFAULT_COLOR });
}

// ---------- Categories ----------

export function listCategories(userId: string) {
  return budgetRepository.listCategories(userId, "createdAt");
}

export async function createCategory(userId: string, input: CreateCategoryInput) {
  if (await budgetRepository.findCategoryByName(userId, input.name, input.type)) {
    throw badRequest("budget.category.alreadyExists");
  }
  return budgetRepository.createCategory(userId, input);
}

export async function updateCategory(userId: string, id: string, input: UpdateCategoryInput) {
  if (await budgetRepository.findOtherCategoryNamed(userId, input.name, id)) {
    throw badRequest("budget.category.duplicateName");
  }
  await budgetRepository.updateCategory(userId, id, input);
}

export function deleteCategory(userId: string, id: string) {
  return budgetRepository.deleteCategory(userId, id);
}

/** Find a category by type and case-insensitive name, creating it if needed. Used by the chatbot. */
export async function findOrCreateCategoryByName(userId: string, name: string, type: CategoryKind) {
  const existing = await budgetRepository.findCategoryByNameInsensitive(userId, name, type);
  return existing ?? budgetRepository.createCategory(userId, { name, type, color: DEFAULT_COLOR });
}

// ---------- Goals ----------

export function listGoals(userId: string, year: number, month: number) {
  return budgetRepository.listGoals(userId, year, month);
}

/** Set a goal for a category owned by the user. */
export async function upsertGoal(userId: string, input: UpsertGoalInput) {
  if (!(await budgetRepository.findCategory(userId, input.categoryId))) {
    throw notFound("budget.goal.categoryNotFound");
  }
  return budgetRepository.upsertGoal(userId, input);
}

// ---------- Transactions ----------

export function listTransactions(userId: string, range?: DateRange) {
  return budgetRepository.listTransactions(userId, range);
}

/** Filter by month when provided, otherwise by the entire year. */
export function transactionPeriod(year: number, month?: number): DateRange {
  return month === undefined ? appYearRange(year) : monthRange(year, month);
}

/** Referenced accounts and categories must belong to the user. */
async function assertReferencesOwned(scope: BudgetTransactionScope, input: CreateTransactionInput) {
  if (input.fromAccountId && !(await scope.findAccount(input.fromAccountId))) {
    throw ownershipError("budget.transaction.fromAccountNotOwned");
  }
  if (input.toAccountId && !(await scope.findAccount(input.toAccountId))) {
    throw ownershipError("budget.transaction.toAccountNotOwned");
  }
  if (input.categoryId && !(await scope.findCategory(input.categoryId))) {
    throw ownershipError("budget.transaction.categoryNotOwned");
  }
}

/**
 * Record a financial transaction and update account balances in a single database transaction.
 * Shared by the budget API and the chatbot.
 */
export function createTransaction(userId: string, input: CreateTransactionInput) {
  return budgetRepository.inTransaction(userId, async (scope) => {
    await assertReferencesOwned(scope, input);
    const record: TransactionRecordData = {
      amount: input.amount,
      type: input.type,
      categoryId: input.categoryId ?? null,
      fromAccountId: input.fromAccountId ?? null,
      toAccountId: input.toAccountId ?? null,
      note: input.note ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    };
    const transaction = await scope.createTransaction(record);
    await scope.applyBalanceDeltas(balanceDeltas(record));
    return transaction;
  });
}

/** Reverse the previous balance changes, apply the new ones and save the edited transaction. */
export function updateTransaction(userId: string, input: UpdateTransactionInput) {
  return budgetRepository.inTransaction(userId, async (scope) => {
    const old = await scope.findTransaction(input.id);
    if (!old) throw ownershipError("budget.transaction.notFoundOrNotOwned");
    await assertReferencesOwned(scope, input);

    // Retain only references appropriate for the new transaction type.
    const record: TransactionRecordData = {
      amount: input.amount,
      type: input.type,
      categoryId: input.type !== "TRANSFER" ? (input.categoryId ?? null) : null,
      fromAccountId: input.type !== "INCOME" ? (input.fromAccountId ?? null) : null,
      toAccountId: input.type !== "EXPENSE" ? (input.toAccountId ?? null) : null,
      note: input.note ?? null,
      // Preserve the original date when omitted. Earlier versions reset it to the current time.
      occurredAt: input.occurredAt ?? old.occurredAt,
    };
    await scope.applyBalanceDeltas(combineDeltas(revertDeltas(old), balanceDeltas(record)));
    return scope.updateTransaction(input.id, record);
  });
}

/** Delete the transaction and reverse its balance changes. */
export function deleteTransaction(userId: string, id: string) {
  return budgetRepository.inTransaction(userId, async (scope) => {
    const old = await scope.findTransaction(id);
    if (!old) throw ownershipError("budget.transaction.notFoundOrCannotDelete");
    await scope.applyBalanceDeltas(revertDeltas(old));
    await scope.deleteTransaction(id);
  });
}
