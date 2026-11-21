"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { notifyDataChanged } from "@/shared/client/cacheSync";
import { Button, Field, FieldLabel, Modal, TextInput, useToast } from "@/shared/ui/components";
import { API_ROUTES } from "@/shared/config/routes";
import { fromDateInputValue, toDateInputValue } from "@/shared/domain/time";
import { formatNumber } from "@/shared/i18n/format";
import { validateTransactionDraft } from "../../domain/transactionDraft";
import type { Account, Category, Transaction, TransactionType } from "../types";
import { AccountSelect } from "./AccountSelect";
import { CategorySelect } from "./CategorySelect";
import { TransactionTypeSelector } from "./TransactionTypeSelector";
import { useExclusiveMenu } from "./useExclusiveMenu";

export interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  accounts: Account[];
  categories: Category[];
  /** Initial transaction type when opening the creation form. */
  initialTab?: TransactionType;
  /** When supplied, edit this transaction with PATCH. Otherwise create one with POST. */
  transaction?: Transaction | null;
}

/** VND amounts use digits only and display thousands separators. */
const digitsOf = (value: string) => value.replace(/\D/g, "");
const formatAmountInput = (digits: string) => (digits ? formatNumber(parseInt(digits, 10)) : "");

/** Form for adding or editing income, expenses and transfers. It owns its state and submits to the API. */
export function TransactionFormModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  initialTab = "EXPENSE",
  transaction = null,
}: TransactionFormModalProps) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const toast = useToast();
  const formId = useId();
  const amountId = useId();
  const isEdit = transaction !== null;

  const [type, setType] = useState<TransactionType>(initialTab);
  const [amountStr, setAmountStr] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { menuProps, closeMenus } = useExclusiveMenu<"category" | "from" | "to">();
  const isTransfer = type === "TRANSFER";

  useEffect(() => {
    if (!isOpen) return;
    closeMenus();
    if (transaction) {
      setType(transaction.type);
      // The amount field accepts whole VND only.
      setAmountStr(formatAmountInput(String(Math.round(transaction.amount))));
      setCategoryId(transaction.categoryId || "");
      setFromAccountId(transaction.fromAccountId || "");
      setToAccountId(transaction.toAccountId || "");
      setNote(transaction.note || "");
      setDate(toDateInputValue(transaction.occurredAt));
    } else {
      // Preserve unfinished entries when adding. The dashboard keeps the modal mounted, so refresh the date each time it opens.
      setType(initialTab);
      setDate(toDateInputValue(new Date()));
    }
  }, [isOpen, initialTab, transaction, closeMenus]);

  const handleTypeChange = (next: TransactionType) => {
    setType(next);
    closeMenus();
  };

  const appendZeros = (zeros: string) => {
    const digits = digitsOf(amountStr);
    setAmountStr(digits ? formatAmountInput(digits + zeros) : "0");
  };

  const resetDraft = () => {
    setAmountStr("");
    setCategoryId("");
    setFromAccountId("");
    setToAccountId("");
    setNote("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const amount = parseInt(digitsOf(amountStr), 10);
    const error = validateTransactionDraft({ amount, type, categoryId, fromAccountId, toAccountId });
    if (error) {
      toast.error(t(`validation.${error}`));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(API_ROUTES.budget.transactions, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(transaction && { id: transaction.id }),
          amount,
          type,
          categoryId: type !== "TRANSFER" ? categoryId : null,
          fromAccountId: type !== "INCOME" ? fromAccountId : null,
          toAccountId: type !== "EXPENSE" ? toAccountId : null,
          note: note.trim(),
          // Edits preserve the saved time on the selected date. New transactions use the current time on that date.
          occurredAt: fromDateInputValue(date, transaction?.occurredAt ?? new Date()).toISOString(),
        }),
      });

      if (res.ok) {
        resetDraft();
        notifyDataChanged("budget");
        onClose();
        onSuccess?.();
      } else {
        const body = await res.json();
        toast.error(body.error || t(isEdit ? "toast.transactionUpdateFailed" : "toast.transactionAddFailed"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("toast.networkError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const dateField = (
    <Field label={t("transactionModal.time")}>
      <TextInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
    </Field>
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEdit ? t("editTransactionModal.title") : tc("finance.addTransaction")}
      size="lg"
      // Allow the dropdown to extend beyond the modal on large screens.
      className="sm:max-h-none sm:overflow-visible"
      footer={
        <Button
          type="submit"
          form={formId}
          size="lg"
          fullWidth
          loading={isSubmitting}
          loadingText={isEdit ? t("editTransactionModal.submitting") : t("transactionModal.submitting")}
        >
          {isEdit ? t("editTransactionModal.submit") : t("transactionModal.submit")}
        </Button>
      }
    >
      <TransactionTypeSelector value={type} onChange={handleTypeChange} className="mb-6" />

      <form id={formId} onSubmit={handleSubmit} className="space-y-6">
        <div>
          <FieldLabel htmlFor={amountId}>{t("transactionModal.amount")}</FieldLabel>
          <div className="flex items-end gap-2 border-b-2 border-primary-soft pb-2">
            <span className="text-2xl font-bold text-primary">{t("currencySymbol")}</span>
            <input
              id={amountId}
              type="text"
              inputMode="numeric"
              value={amountStr}
              onChange={(e) => setAmountStr(formatAmountInput(digitsOf(e.target.value)))}
              placeholder="0"
              className="w-full bg-transparent text-3xl font-black text-primary outline-none sm:text-4xl"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => appendZeros("00")}>
              +00
            </Button>
            <Button variant="secondary" size="sm" onClick={() => appendZeros("000")}>
              +000
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-6">
          {/* First row */}
          {isTransfer ? (
            <Field label={t("transactionModal.fromAccount")}>
              <AccountSelect accounts={accounts} value={fromAccountId} onChange={setFromAccountId} {...menuProps("from")} />
            </Field>
          ) : (
            <Field label={t("transactionModal.category")}>
              <CategorySelect
                categories={categories.filter((c) => c.type === type)}
                value={categoryId}
                onChange={setCategoryId}
                {...menuProps("category")}
              />
            </Field>
          )}
          {isTransfer ? (
            <Field label={t("transactionModal.toAccount")}>
              <AccountSelect accounts={accounts} value={toAccountId} onChange={setToAccountId} {...menuProps("to")} />
            </Field>
          ) : (
            dateField
          )}

          {/* Second row */}
          {isTransfer ? (
            dateField
          ) : (
            <Field label={t("transactionModal.moneySource")}>
              <AccountSelect
                accounts={accounts}
                value={type === "INCOME" ? toAccountId : fromAccountId}
                onChange={type === "INCOME" ? setToAccountId : setFromAccountId}
                dropUp
                {...menuProps(type === "INCOME" ? "to" : "from")}
              />
            </Field>
          )}
          <Field label={t("transactionModal.note")}>
            <TextInput type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={tc("finance.notePlaceholder")} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
