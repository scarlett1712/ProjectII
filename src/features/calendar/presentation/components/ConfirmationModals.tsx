"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ScopeChoiceModal, type ScopeChoice } from "./ScopeChoiceModal";

type Scope = "one" | "future" | "all";

export type DeleteConfirmState = {
  show: boolean;
  id: string;
  isTask: boolean;
  isRecurring: boolean;
} | null;

export type SaveConfirmState = {
  show: boolean;
  payload: any;
} | null;

interface ConfirmationModalsProps {
  deleteConfirm: DeleteConfirmState;
  setDeleteConfirm: (val: DeleteConfirmState) => void;
  executeDelete: (id: string, isTask: boolean, scope: Scope) => void | Promise<void>;
  saveConfirm: SaveConfirmState;
  setSaveConfirm: (val: SaveConfirmState) => void;
  executeSave: (payload: any, scope: Scope) => void | Promise<void>;
}

/** Keep the last non-null value so the modal content stays visible during its exit animation. */
function useRetained<T>(value: T | null): T | null {
  const [kept, setKept] = useState(value);
  if (value !== null && value !== kept) setKept(value);
  return value ?? kept;
}

export function ConfirmationModals({
  deleteConfirm,
  setDeleteConfirm,
  executeDelete,
  saveConfirm,
  setSaveConfirm,
  executeSave,
}: ConfirmationModalsProps) {
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const shownDelete = useRetained(deleteConfirm);
  const shownSave = useRetained(saveConfirm);

  const deleteItem = shownDelete?.isTask ? t("confirmModal.itemTask") : t("confirmModal.itemEvent");
  const deleteWith = (scope: Scope) => () => {
    if (!shownDelete) return;
    executeDelete(shownDelete.id, shownDelete.isTask, scope);
    setDeleteConfirm(null);
  };
  const deleteChoices: ScopeChoice[] = shownDelete?.isRecurring
    ? [
        { key: "one", label: t("confirmModal.deleteOne"), variant: "secondary", onSelect: deleteWith("one") },
        { key: "future", label: t("confirmModal.deleteFuture"), variant: "secondary", onSelect: deleteWith("future") },
        { key: "all", label: t("confirmModal.deleteAll"), variant: "danger", onSelect: deleteWith("all") },
      ]
    : [{ key: "all", label: tc("action.confirmDelete"), variant: "danger", onSelect: deleteWith("all") }];

  const saveWith = (scope: Scope) => () => {
    if (!shownSave) return;
    executeSave(shownSave.payload, scope);
    setSaveConfirm(null);
  };
  const saveChoices: ScopeChoice[] = [
    { key: "one", label: t("confirmModal.saveOne"), variant: "secondary", onSelect: saveWith("one") },
    { key: "future", label: t("confirmModal.saveFuture"), variant: "secondary", onSelect: saveWith("future") },
    { key: "all", label: t("confirmModal.saveAll"), variant: "primary", onSelect: saveWith("all") },
  ];

  return (
    <>
      <ScopeChoiceModal
        open={!!deleteConfirm?.show}
        onClose={() => setDeleteConfirm(null)}
        title={t("confirmModal.deleteTitle", { item: deleteItem })}
        message={
          shownDelete?.isRecurring
            ? t("confirmModal.deleteRecurringMessage")
            : t("confirmModal.deleteMessage", { item: deleteItem })
        }
        choices={deleteChoices}
      />
      <ScopeChoiceModal
        open={!!saveConfirm?.show}
        onClose={() => setSaveConfirm(null)}
        title={t("confirmModal.saveTitle")}
        message={t("confirmModal.saveMessage")}
        choices={saveChoices}
      />
    </>
  );
}
