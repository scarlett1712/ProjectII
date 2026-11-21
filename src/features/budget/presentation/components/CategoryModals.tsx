"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/shared/ui/components";
import type { Category } from "../types";
import { CategoryFormFields } from "./CategoryFormFields";

interface CategoryModalsProps {
  showAddCategory: boolean;
  onClose: () => void;
  categoryType: "INCOME" | "EXPENSE";
  categoryName: string;
  setCategoryName: (val: string) => void;
  categoryColor: string;
  setCategoryColor: (val: string) => void;
  handleAddCategory: (e: React.FormEvent) => void;

  showEditCategory: boolean;
  editingCategory: Category | null;
  handleEditCategory: (e: React.FormEvent) => void;
  handleDeleteCategory: (id: string) => void;

  isSubmitting: boolean;
}

export function CategoryModals({
  showAddCategory,
  onClose,
  categoryType,
  categoryName,
  setCategoryName,
  categoryColor,
  setCategoryColor,
  handleAddCategory,

  showEditCategory,
  editingCategory,
  handleEditCategory,
  handleDeleteCategory,

  isSubmitting,
}: CategoryModalsProps) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const addFormId = useId();
  const editFormId = useId();


  const fieldProps = {
    name: categoryName,
    onNameChange: setCategoryName,
    color: categoryColor,
    onColorChange: setCategoryColor,
  };

  return (
    <>
      <Modal
        open={showAddCategory}
        onClose={onClose}
        title={`${t("categoryModal.addTitle")} ${categoryType === "INCOME" ? tc("finance.income") : tc("finance.expense")}`}
        footer={
          <Button type="submit" form={addFormId} fullWidth loading={isSubmitting} loadingText={tc("action.saving")}>
            {t("categoryModal.submit")}
          </Button>
        }
      >
        <form id={addFormId} onSubmit={handleAddCategory} className="space-y-4">
          <CategoryFormFields
            {...fieldProps}
            nameLabel={t("categoryModal.newName")}
            namePlaceholder={t("categoryModal.namePlaceholder")}
          />
        </form>
      </Modal>

      <Modal
        open={showEditCategory && editingCategory !== null}
        onClose={onClose}
        title={t("categoryModal.editTitle")}
        footer={
          <>
            <Button variant="danger" onClick={() => editingCategory && handleDeleteCategory(editingCategory.id)}>
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
        <form id={editFormId} onSubmit={handleEditCategory} className="space-y-4">
          <CategoryFormFields
            {...fieldProps}
            nameLabel={t("categoryModal.name")}
            namePlaceholder={t("categoryModal.editNamePlaceholder")}
          />
        </form>
      </Modal>
    </>
  );
}
