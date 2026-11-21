"use client";

import { useTranslations } from "next-intl";
import { TagFormModal } from "./TagFormModal";

import type { Tag } from "../types";

interface TagModalsProps {
  showTagModal: boolean;
  onClose: () => void;
  newTagName: string;
  setNewTagName: (val: string) => void;
  newTagColor: string;
  setNewTagColor: (val: string) => void;
  handleCreateTag: (e: React.FormEvent) => void;

  editingTag: Tag | null;
  onEditTag: (tag: Tag) => void;
  handleUpdateTag: (id: string, name: string, color: string) => void;
}

export function TagModals({
  showTagModal,
  onClose,
  newTagName,
  setNewTagName,
  newTagColor,
  setNewTagColor,
  handleCreateTag,

  editingTag,
  onEditTag,
  handleUpdateTag,
}: TagModalsProps) {
  const t = useTranslations("calendar");
  const tc = useTranslations("common");

  return (
    <>
      <TagFormModal
        open={showTagModal}
        onClose={onClose}
        title={t("tagModal.addTitle")}
        name={newTagName}
        onNameChange={setNewTagName}
        color={newTagColor}
        onColorChange={setNewTagColor}
        onSubmit={handleCreateTag}
        submitLabel={t("tagModal.saveTag")}
        namePlaceholder={t("tagModal.namePlaceholder")}
      />

      <TagFormModal
        open={!!editingTag}
        onClose={onClose}
        title={t("tagModal.editTitle")}
        name={editingTag?.name ?? ""}
        onNameChange={(name) => editingTag && onEditTag({ ...editingTag, name })}
        color={editingTag?.color ?? ""}
        onColorChange={(color) => editingTag && onEditTag({ ...editingTag, color })}
        onSubmit={(e) => {
          e.preventDefault();
          if (editingTag) {
            handleUpdateTag(editingTag.id, editingTag.name, editingTag.color);
          }
        }}
        submitLabel={tc("action.update")}
      />
    </>
  );
}
