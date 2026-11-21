"use client";

import { useTranslations } from "next-intl";
import { formatVND } from "@/shared/i18n/format";
import { colors } from "@/shared/theme/tokens";
import type { Account } from "../types";
import { TagSelect } from "./TagSelect";

interface AccountSelectProps {
  id?: string;
  accounts: readonly Account[];
  value: string;
  onChange: (accountId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropUp?: boolean;
}

/** Account selector showing the balance of each funding source. */
export function AccountSelect({ accounts, ...props }: AccountSelectProps) {
  const t = useTranslations("budget");
  return (
    <TagSelect
      {...props}
      items={accounts}
      placeholder={t("transactionModal.selectAccount")}
      emptyText={t("noAccounts")}
      fallbackColor={colors.primary}
      renderDetail={(account) => formatVND(account.balance)}
    />
  );
}
