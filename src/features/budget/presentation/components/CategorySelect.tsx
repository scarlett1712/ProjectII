"use client";

import { useTranslations } from "next-intl";
import type { Category } from "../types";
import { TagSelect } from "./TagSelect";

interface CategorySelectProps {
  id?: string;
  /** Categories filtered by the selected transaction type. */
  categories: readonly Category[];
  value: string;
  onChange: (categoryId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Select an income or expense category for the transaction. */
export function CategorySelect({ categories, ...props }: CategorySelectProps) {
  const t = useTranslations("budget");
  return (
    <TagSelect
      {...props}
      items={categories}
      placeholder={t("transactionModal.selectCategory")}
      emptyText={t("transactionModal.noCategories")}
    />
  );
}
