import { readJson, withUser } from "@/shared/presentation/http";
import { createTransactionSchema, idSchema, periodQuerySchema, updateTransactionSchema } from "../../application/budgetSchemas";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  transactionPeriod,
  updateTransaction,
} from "../../application/budgetUseCases";

const options = { errorCode: "common.serverError" } as const;

export const GET = withUser((req, userId) => {
  const { searchParams } = new URL(req.url);
  const { year, month } = periodQuerySchema.parse({ year: searchParams.get("year"), month: searchParams.get("month") });
  // Return all transactions when no filter is supplied.
  return year === undefined ? listTransactions(userId) : listTransactions(userId, transactionPeriod(year, month));
}, options);

export const POST = withUser(async (req, userId) => {
  return createTransaction(userId, createTransactionSchema.parse(await readJson(req)));
}, options);

export const PATCH = withUser(async (req, userId) => {
  return updateTransaction(userId, updateTransactionSchema.parse(await readJson(req)));
}, options);

export const DELETE = withUser(async (req, userId) => {
  const id = idSchema.parse(new URL(req.url).searchParams.get("id") ?? "");
  await deleteTransaction(userId, id);
  return { ok: true };
}, options);
