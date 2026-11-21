"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton, cn } from "@/shared/ui/components";
import { formatFullDate, formatVND } from "@/shared/i18n/format";
import { colors } from "@/shared/theme/tokens";
import type { Account, Transaction } from "../types";
import { TagPill } from "./TagPill";

/** Income lists receipts. Outgoing includes spending and transfers. */
type Variant = "income" | "outgoing";

const VARIANT_KEYS = {
  income: {
    title: "transactionLog.incomeTitle",
    categoryColumn: "transactionLog.columnCategory",
    accountColumn: "transactionLog.columnToAccount",
    lastColumn: "transactionLog.columnDetail",
    empty: "transactionLog.incomeEmpty",
  },
  outgoing: {
    title: "transactionLog.expenseTitle",
    categoryColumn: "transactionLog.columnCategoryOrType",
    accountColumn: "transactionLog.columnFromAccount",
    lastColumn: "transactionLog.columnToOrNote",
    empty: "transactionLog.expenseEmpty",
  },
} as const;

interface TransactionLogTableProps {
  variant: Variant;
  /** Transactions filtered by variant. */
  transactions: readonly Transaction[];
  /** Relevant account balance after each transaction, keyed by transaction ID. */
  balanceAfter: ReadonlyMap<string, number>;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

/** Detailed transaction history for the month. */
export function TransactionLogTable({ variant, transactions, balanceAfter, onEdit, onDelete }: TransactionLogTableProps) {
  const t = useTranslations("budget");
  const keys = VARIANT_KEYS[variant];
  const isIncome = variant === "income";

  const accountPill = (account: Account | null | undefined) =>
    account ? (
      <TagPill name={account.name} color={account.color || colors.primary} size="sm" />
    ) : (
      <span className="text-gray-400 font-bold">{t("wallet")}</span>
    );

  return (
    <div className="bg-white rounded-4xl p-6 shadow-sm border border-purple-50">
      <h3 className="text-sm font-black text-purple-950 mb-4">{t(keys.title)}</h3>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-thin">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-white z-10 shadow-divider">
            <tr className="text-2xs font-black text-gray-400 uppercase tracking-wider bg-white">
              <th className="px-3 py-2.5 bg-white">{t(keys.categoryColumn)}</th>
              <th className="px-3 py-2.5 bg-white">{t("transactionLog.columnDate")}</th>
              <th className="px-3 py-2.5 bg-white text-right">{t("transactionLog.columnAmount")}</th>
              <th className="px-3 py-2.5 bg-white">{t(keys.accountColumn)}</th>
              <th className="px-3 py-2.5 bg-white text-right">{t("transactionLog.columnBalance")}</th>
              <th className="px-3 py-2.5 bg-white">{t(keys.lastColumn)}</th>
              <th className="px-3 py-2.5 bg-white text-center">{t("transactionLog.columnActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-50/50 font-semibold text-gray-600">
            {transactions.map((tx) => {
              const isTransfer = tx.type === "TRANSFER";
              return (
                <tr key={tx.id} className="hover:bg-purple-50/10">
                  <td className="px-3 py-2.5 font-bold text-gray-900 flex items-center gap-1.5">
                    {isTransfer ? (
                      <>
                        <span className="w-2 h-2 rounded-full shrink-0 bg-indigo-500" />
                        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-2xs font-black uppercase font-sans">
                          {t("transactionType.TRANSFER")}
                        </span>
                      </>
                    ) : tx.category ? (
                      <TagPill name={tx.category.name} color={tx.category.color} size="sm" />
                    ) : (
                      <span className="text-gray-400 font-bold">{t("other")}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{formatFullDate(tx.occurredAt)}</td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right font-bold",
                      isIncome ? "text-emerald-600" : isTransfer ? "text-indigo-500" : "text-red-500",
                    )}
                  >
                    {isIncome ? "+" : isTransfer ? "" : "-"}
                    {formatVND(tx.amount)}
                  </td>
                  <td className="px-3 py-2.5">{accountPill(isIncome ? tx.toAccount : tx.fromAccount)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-purple-950 whitespace-nowrap">
                    {formatVND(balanceAfter.get(tx.id) ?? 0)}
                  </td>
                  <td
                    className={cn("px-3 py-2.5 truncate", isIncome ? "max-w-[80px]" : "max-w-[120px]")}
                    title={isTransfer ? t("transactionLog.transferTo", { accountName: String(tx.toAccount?.name) }) : tx.note || ""}
                  >
                    {isTransfer ? (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">➔</span>
                        {accountPill(tx.toAccount)}
                      </div>
                    ) : (
                      tx.note || "-"
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center flex items-center justify-center gap-2">
                    <IconButton label={t("transactionLog.edit")} onClick={() => onEdit(tx)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton label={t("transactionLog.delete")} onClick={() => onDelete(tx.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                  {t(keys.empty)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
