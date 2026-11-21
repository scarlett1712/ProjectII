import type { Prisma } from "@prisma/client";
import { db } from "@/shared/infrastructure/db";
import type { BalanceDeltas, CategoryKind, TransactionKind } from "../domain/balance";

const WITH_RELATIONS = { category: true, fromAccount: true, toAccount: true } as const;

interface AccountData {
  name: string;
  balance: number;
  color: string;
}

interface CategoryData {
  name: string;
  type: CategoryKind;
  color: string;
}

interface GoalData {
  categoryId: string;
  amount: number;
  year: number;
  month: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

/** Normalized transaction fields written to the database, including explicit nulls. */
export interface TransactionRecordData {
  amount: number;
  type: TransactionKind;
  categoryId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  note: string | null;
  occurredAt: Date;
}

/** Database operations within one transaction, scoped to userId. */
function scopedTransaction(tx: Prisma.TransactionClient, userId: string) {
  return {
    findAccount(id: string) {
      return tx.budgetAccount.findFirst({ where: { id, userId } });
    },

    findCategory(id: string) {
      return tx.budgetCategory.findFirst({ where: { id, userId } });
    },

    findTransaction(id: string) {
      return tx.budgetTransaction.findFirst({ where: { id, userId } });
    },

    createTransaction(data: TransactionRecordData) {
      return tx.budgetTransaction.create({ data: { userId, ...data } });
    },

    updateTransaction(id: string, data: TransactionRecordData) {
      return tx.budgetTransaction.update({ where: { id, userId }, data });
    },

    async deleteTransaction(id: string) {
      await tx.budgetTransaction.delete({ where: { id, userId } });
    },

    async applyBalanceDeltas(deltas: BalanceDeltas) {
      for (const [accountId, delta] of deltas) {
        if (delta === 0) continue;
        await tx.budgetAccount.updateMany({
          where: { id: accountId, userId },
          data: { balance: { increment: delta } },
        });
      }
    },
  };
}

export type BudgetTransactionScope = ReturnType<typeof scopedTransaction>;

export const budgetRepository = {
  /** Run work in a database transaction and roll back all changes if it throws. */
  inTransaction<T>(userId: string, work: (scope: BudgetTransactionScope) => Promise<T>) {
    return db.$transaction((tx) => work(scopedTransaction(tx, userId)));
  },

  listAccounts(userId: string) {
    return db.budgetAccount.findMany({ where: { userId }, orderBy: { name: "asc" } });
  },

  findAccountByName(userId: string, name: string) {
    return db.budgetAccount.findFirst({
      where: { userId, name: { equals: name, mode: "insensitive" } },
    });
  },

  createAccount(userId: string, input: AccountData) {
    return db.budgetAccount.create({ data: { userId, ...input } });
  },

  updateAccount(userId: string, id: string, input: Partial<AccountData>) {
    return db.budgetAccount.updateMany({ where: { id, userId }, data: input });
  },

  async deleteAccount(userId: string, id: string) {
    await db.budgetAccount.deleteMany({ where: { id, userId } });
  },

  listCategories(userId: string, orderBy: "name" | "createdAt") {
    return db.budgetCategory.findMany({ where: { userId }, orderBy: { [orderBy]: "asc" } });
  },

  findCategory(userId: string, id: string) {
    return db.budgetCategory.findFirst({ where: { id, userId } });
  },

  findCategoryByName(userId: string, name: string, type: CategoryKind) {
    return db.budgetCategory.findFirst({ where: { userId, name, type } });
  },

  findCategoryByNameInsensitive(userId: string, name: string, type: CategoryKind) {
    return db.budgetCategory.findFirst({
      where: { userId, type, name: { equals: name, mode: "insensitive" } },
    });
  },

  /** Another category already uses this name, regardless of type. */
  findOtherCategoryNamed(userId: string, name: string, excludeId: string) {
    return db.budgetCategory.findFirst({ where: { userId, name, id: { not: excludeId } } });
  },

  createCategory(userId: string, input: CategoryData) {
    return db.budgetCategory.create({ data: { userId, ...input } });
  },

  async updateCategory(userId: string, id: string, input: { name: string; color?: string }) {
    await db.budgetCategory.update({ where: { id, userId }, data: input });
  },

  async deleteCategory(userId: string, id: string) {
    await db.budgetCategory.deleteMany({ where: { id, userId } });
  },

  listGoals(userId: string, year: number, month: number) {
    return db.budgetGoal.findMany({ where: { userId, year, month } });
  },

  upsertGoal(userId: string, { categoryId, amount, year, month }: GoalData) {
    return db.budgetGoal.upsert({
      where: { userId_categoryId_year_month: { userId, categoryId, year, month } },
      update: { amount },
      create: { userId, categoryId, amount, year, month },
    });
  },

  /** Transactions with their category and accounts, newest first. Omit range to return all transactions. */
  listTransactions(userId: string, range?: DateRange) {
    return db.budgetTransaction.findMany({
      where: { userId, ...(range && { occurredAt: { gte: range.start, lt: range.end } }) },
      include: WITH_RELATIONS,
      orderBy: { occurredAt: "desc" },
    });
  },

  /** Fields affecting account balances for all transactions from since onward. */
  listBalanceMovementsSince(userId: string, since: Date) {
    return db.budgetTransaction.findMany({
      where: { userId, occurredAt: { gte: since } },
      select: { type: true, amount: true, fromAccountId: true, toAccountId: true },
    });
  },
};
