import { z } from "zod";
import { optionalDate } from "@/shared/application/schemaFields";
import { TRANSACTION_TYPES, type CategoryKind, type TransactionKind } from "../domain/balance";
import { defaultColors } from "@/shared/theme/palettes";
import { messageKey } from "@/shared/application/errors";
import { validateTransactionDraft, type TransactionDraft, type TransactionDraftError } from "../domain/transactionDraft";

const INVALID_BODY = messageKey("common.invalidBody");
const DEFAULT_COLOR = defaultColors.tag;

/** Treat falsy values such as an empty string, zero or null as omitted, matching the previous API's x || null. */
const optionalString = (message: string) =>
  z.preprocess((v) => v || undefined, z.string({ error: message }).optional());

/** Check required fields for truthiness first to preserve the order of validation errors. */
const requireFields = (keys: string[], message: string) =>
  z.looseObject({}, { error: INVALID_BODY }).refine((body) => keys.every((key) => body[key]), message);

const transactionFields = {
  amount: z.coerce.number({ error: messageKey("budget.transaction.invalidAmount") }).positive(messageKey("budget.transaction.invalidAmount")),
  type: z.enum(TRANSACTION_TYPES, { error: messageKey("budget.transaction.invalidType") }),
  categoryId: optionalString(messageKey("budget.transaction.invalidCategory")),
  fromAccountId: optionalString(messageKey("budget.transaction.invalidFromAccount")),
  toAccountId: optionalString(messageKey("budget.transaction.invalidToAccount")),
  note: optionalString(messageKey("budget.transaction.invalidNote")),
  occurredAt: optionalDate,
};

const DRAFT_ERROR_KEYS: Record<TransactionDraftError, string> = {
  invalidAmount: messageKey("budget.transaction.invalidAmount"),
  selectCategory: messageKey("budget.transaction.selectCategory"),
  selectFromAccount: messageKey("budget.transaction.selectFromAccount"),
  selectToAccount: messageKey("budget.transaction.selectToAccount"),
  selectTransferAccounts: messageKey("budget.transaction.selectTransferAccounts"),
};

/** Apply the client form rules to direct API requests so each transaction has its required category and accounts. */
const refineDraft = (draft: TransactionDraft, ctx: z.RefinementCtx) => {
  const error = validateTransactionDraft(draft);
  if (error) ctx.addIssue({ code: "custom", message: DRAFT_ERROR_KEYS[error] });
};

export const createTransactionSchema = requireFields(["amount", "type"], messageKey("budget.transaction.amountAndTypeRequired")).pipe(
  z.object(transactionFields).superRefine(refineDraft),
);

export const updateTransactionSchema = requireFields(["id", "amount", "type"], messageKey("budget.transaction.missingUpdateFields")).pipe(
  z.object({ id: z.string({ error: messageKey("budget.transaction.missingUpdateFields") }), ...transactionFields }).superRefine(refineDraft),
);

export interface CreateTransactionInput {
  amount: number;
  type: TransactionKind;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  note?: string;
  /** An omitted date defaults to the current time. */
  occurredAt?: Date;
}

export interface UpdateTransactionInput extends CreateTransactionInput {
  id: string;
}

export const idSchema = z.string({ error: messageKey("common.missingId") }).min(1, messageKey("common.missingId"));

const trimmed = z.unknown().transform((v) => String(v).trim());
const colorOrDefault = z.unknown().optional().transform((v) => (v ? String(v).trim() : DEFAULT_COLOR));

export const createAccountSchema = z.object(
  {
    name: z.unknown().refine(Boolean, messageKey("budget.account.nameRequired")).pipe(trimmed),
    balance: z.preprocess((v) => v || 0, z.coerce.number({ error: messageKey("budget.account.invalidBalance") })),
    color: colorOrDefault,
  },
  { error: INVALID_BODY },
);

/** Update only fields whose values differ from undefined, matching the previous API. */
export const updateAccountSchema = z.object(
  {
    id: z.unknown().refine(Boolean, messageKey("common.missingId")).pipe(z.string({ error: messageKey("common.missingId") })),
    name: trimmed.optional(),
    balance: z.coerce.number({ error: messageKey("budget.account.invalidBalance") }).optional(),
    color: trimmed.optional(),
  },
  { error: INVALID_BODY },
);

export interface CreateAccountInput {
  name: string;
  balance: number;
  color: string;
}

export interface UpdateAccountInput {
  name?: string;
  balance?: number;
  color?: string;
}

const MISSING_CATEGORY_FIELDS = messageKey("budget.category.missingNameOrType");

export const createCategorySchema = z.object(
  {
    name: z.unknown().refine(Boolean, MISSING_CATEGORY_FIELDS).pipe(trimmed),
    type: z
      .unknown()
      .refine(Boolean, MISSING_CATEGORY_FIELDS)
      .pipe(z.enum(["INCOME", "EXPENSE"], { error: messageKey("budget.transaction.invalidType") })),
    color: colorOrDefault,
  },
  { error: INVALID_BODY },
);

const MISSING_CATEGORY_UPDATE = messageKey("budget.category.missingIdOrName");

export const updateCategorySchema = z.object(
  {
    id: z.unknown().refine(Boolean, MISSING_CATEGORY_UPDATE).pipe(z.string({ error: MISSING_CATEGORY_UPDATE })),
    name: z.unknown().refine(Boolean, MISSING_CATEGORY_UPDATE).pipe(trimmed),
    color: z
      .unknown()
      .optional()
      .transform((v) => (v ? String(v).trim() : undefined)),
  },
  { error: INVALID_BODY },
);

export interface CreateCategoryInput {
  name: string;
  type: CategoryKind;
  color: string;
}

export interface UpdateCategoryInput {
  name: string;
  /** Omit the color to retain its current value. */
  color?: string;
}

const INVALID_PERIOD = messageKey("budget.invalidPeriod");
const INVALID_YEAR = messageKey("budget.invalidYear");
const INVALID_MONTH = messageKey("budget.invalidMonth");

/** Accept years 2000–2100 and months 1–12. Date would roll month 13 into January of the next year. */
const yearField = (message: string) => z.coerce.number({ error: message }).int(message).min(2000, message).max(2100, message);
const monthField = (message: string) => z.coerce.number({ error: message }).int(message).min(1, message).max(12, message);
/** Treat missing and empty query parameters as omitted. */
const optionalQuery = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((v) => (v === null || v === "" ? undefined : v), schema.optional());

export const goalPeriodSchema = z.object({
  year: yearField(INVALID_PERIOD),
  month: monthField(INVALID_PERIOD),
});

/** Optional year and month for the overview, opening balances and transaction filters. A month requires a year. */
export const periodQuerySchema = z
  .object({ year: optionalQuery(yearField(INVALID_YEAR)), month: optionalQuery(monthField(INVALID_MONTH)) })
  .refine((p) => p.month === undefined || p.year !== undefined, { message: INVALID_YEAR });

export type PeriodQuery = z.infer<typeof periodQuerySchema>;

const MISSING_GOAL = messageKey("budget.goal.missingData");

export const upsertGoalSchema = z.object(
  {
    categoryId: z.unknown().refine(Boolean, MISSING_GOAL).pipe(z.string({ error: MISSING_GOAL })),
    year: yearField(MISSING_GOAL),
    month: monthField(MISSING_GOAL),
    // Validate this field last to preserve the priority of missing-field errors.
    amount: z
      .unknown()
      .refine((v) => v !== undefined, MISSING_GOAL)
      .pipe(z.coerce.number({ error: messageKey("budget.transaction.invalidAmount") })),
  },
  { error: INVALID_BODY },
);

export interface UpsertGoalInput {
  categoryId: string;
  amount: number;
  year: number;
  month: number;
}
