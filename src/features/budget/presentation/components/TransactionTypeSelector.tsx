"use client";

import { useTranslations } from "next-intl";
import { SegmentedControl } from "@/shared/ui/components";
import type { TransactionType } from "../types";

interface TransactionTypeSelectorProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
  className?: string;
}

/** Choose an expense, income or transfer. */
export function TransactionTypeSelector({ value, onChange, className }: TransactionTypeSelectorProps) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  return (
    <SegmentedControl<TransactionType>
      options={[
        { value: "EXPENSE", label: tc("finance.expense") },
        { value: "INCOME", label: tc("finance.income") },
        { value: "TRANSFER", label: t("transactionType.TRANSFER") },
      ]}
      value={value}
      onChange={onChange}
      size="sm"
      className={className}
    />
  );
}
