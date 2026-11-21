"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/shared/ui/components";
import type { Account } from "../types";
import { AccountFormFields } from "./AccountFormFields";

interface AccountModalsProps {
  showAddAccount: boolean;
  onClose: () => void;
  handleAddAccount: (e: React.FormEvent) => void;

  showEditAccount: boolean;
  editingAccount: Account | null;
  handleEditAccount: (e: React.FormEvent) => void;
  handleDeleteAccount: (id: string) => void;

  accountName: string;
  setAccountName: (val: string) => void;
  accountBalance: string;
  setAccountBalance: (val: string) => void;
  accountColor: string;
  setAccountColor: (val: string) => void;

  isSubmitting: boolean;
}

export function AccountModals({
  showAddAccount,
  onClose,
  handleAddAccount,

  showEditAccount,
  editingAccount,
  handleEditAccount,
  handleDeleteAccount,

  accountName,
  setAccountName,
  accountBalance,
  setAccountBalance,
  accountColor,
  setAccountColor,

  isSubmitting,
}: AccountModalsProps) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const addFormId = useId();
  const editFormId = useId();


  const fieldProps = {
    name: accountName,
    onNameChange: setAccountName,
    balance: accountBalance,
    onBalanceChange: setAccountBalance,
    color: accountColor,
    onColorChange: setAccountColor,
  };

  return (
    <>
      <Modal
        open={showAddAccount}
        onClose={onClose}
        title={t("accountModal.addTitle")}
        footer={
          <Button type="submit" form={addFormId} fullWidth loading={isSubmitting} loadingText={tc("action.saving")}>
            {t("accountModal.submit")}
          </Button>
        }
      >
        <form id={addFormId} onSubmit={handleAddAccount} className="space-y-4">
          <AccountFormFields {...fieldProps} namePlaceholder={t("accountModal.namePlaceholder")} />
        </form>
      </Modal>

      <Modal
        open={showEditAccount && editingAccount !== null}
        onClose={onClose}
        title={t("accountModal.editTitle")}
        footer={
          <>
            <Button variant="danger" onClick={() => editingAccount && handleDeleteAccount(editingAccount.id)}>
              {tc("action.delete")}
            </Button>
            <Button
              type="submit"
              form={editFormId}
              className="flex-1"
              loading={isSubmitting}
              loadingText={tc("action.saving")}
            >
              {tc("action.saveChanges")}
            </Button>
          </>
        }
      >
        <form id={editFormId} onSubmit={handleEditAccount} className="space-y-4">
          <AccountFormFields {...fieldProps} namePlaceholder={t("accountModal.editNamePlaceholder")} />
        </form>
      </Modal>
    </>
  );
}
