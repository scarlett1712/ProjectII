import { readJson, withUser } from "@/shared/presentation/http";
import { createAccountSchema, idSchema, periodQuerySchema, updateAccountSchema } from "../../application/budgetSchemas";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "../../application/budgetUseCases";

const options = { errorCode: "common.serverError" } as const;

export const GET = withUser((req, userId) => {
  const { searchParams } = new URL(req.url);
  const { year, month } = periodQuerySchema.parse({ year: searchParams.get("year"), month: searchParams.get("month") });
  // Calculate opening balances only when both year and month are supplied.
  return listAccounts(userId, year !== undefined && month !== undefined ? { year, month } : undefined);
}, options);

export const POST = withUser(async (req, userId) => {
  return createAccount(userId, createAccountSchema.parse(await readJson(req)));
}, options);

export const PATCH = withUser(async (req, userId) => {
  const { id, ...changes } = updateAccountSchema.parse(await readJson(req));
  return updateAccount(userId, id, changes);
}, options);

export const DELETE = withUser(async (req, userId) => {
  const id = idSchema.parse(new URL(req.url).searchParams.get("id") ?? "");
  await deleteAccount(userId, id);
  return { ok: true };
}, options);
