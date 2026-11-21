"use client";

import type { Account, Category, TransactionType } from "../types";
import { TransactionFormModal } from "./TransactionFormModal";

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  accounts: Account[];
  categories: Category[];
  initialTab?: TransactionType;
}

/** New transaction form for Dashboard and Budget. Edits use TransactionFormModal directly. */
export function TransactionModal(props: TransactionModalProps) {
  return <TransactionFormModal {...props} />;
}
