import { useTranslations } from "next-intl";
import { useState } from "react";
import { notifyDataChanged } from "@/shared/client/cacheSync";
import { apiErrorMessage, apiRequest } from "@/shared/client/api";
import { Tag } from "@/features/calendar/presentation/types";
import { defaultColors } from "@/shared/theme/palettes";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { useLocalStorageState } from "@/shared/client/hooks";
import { TAG_OVERRIDES_STORAGE_KEY, type TagOverrides } from "@/features/calendar/presentation/tagOverrides";
import { STORAGE_KEYS } from "@/shared/client/storageKeys";
import { isSystemTagId } from "@/features/calendar/domain/systemTags";

export function useCalendarTags(setTags: React.Dispatch<React.SetStateAction<Tag[]>>, showToast: (message: string) => void,
  showError: (message: string) => void, showConfirm: (title: string, message: string, action: () => void) => void) {
  const t = useTranslations("calendar");
  // Tag overrides for system tags (stored in localStorage)
  const [, setTagOverrides] = useLocalStorageState<TagOverrides>(TAG_OVERRIDES_STORAGE_KEY, {});
  const [modal, setModal] = useState<{ type: "create" } | { type: "edit"; tag: Tag } | null>(null);
  const close = () => setModal(null);
  // Store hidden tag IDs so tags added on another screen are visible by default.
  const [hiddenTagIds, setHiddenTagIds] = useLocalStorageState<string[]>(STORAGE_KEYS.calendarHiddenTags, []);
  // Tag creation form
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(defaultColors.event);
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const newTag = await apiRequest<Tag>(API_ROUTES.tags, { method: "POST", body: { name: newTagName, color: newTagColor } });
      setTags((prev) => [...prev, newTag]);
      setNewTagName("");
      close();
      notifyDataChanged("tags");
    } catch (e) {
      showError(apiErrorMessage(e, t("tagActions.createFailed")));
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (isSystemTagId(tagId)) {
      showError(t("tagActions.systemTagNotDeletable"));
      return;
    }
    showConfirm(
      t("tagActions.deleteTitle"),
      t("tagActions.deleteMessage"),
      async () => {
        try {
          await apiRequest(withQuery(API_ROUTES.tags, { id: tagId }), { method: "DELETE" });
          setTags((prev) => prev.filter((t) => t.id !== tagId));
          setHiddenTagIds((prev) => prev.filter((id) => id !== tagId));
          showToast(t("tagActions.deleted"));
          notifyDataChanged("tags");
        } catch (e) {
          showError(apiErrorMessage(e, t("tagActions.deleteFailed")));
        }
      }
    );
  };

  const handleUpdateTag = async (tagId: string, name: string, color: string) => {
    if (isSystemTagId(tagId)) {
      // System tags: save override to localStorage and update local state
      setTagOverrides((prev) => ({ ...prev, [tagId]: { name, color } }));
      setTags(prev => prev.map(t => t.id === tagId ? { ...t, name, color } : t));
      close();
      showToast(t("tagActions.updated"));
    } else {
      try {
        const res = await fetch(API_ROUTES.tags, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: tagId, name, color })
        });
        if (res.ok) {
          setTags(prev => prev.map(t => t.id === tagId ? { ...t, name, color } : t));
          close();
          showToast(t("tagActions.updated"));
          notifyDataChanged("tags");
        } else {
          showError(t("tagActions.updateFailed"));
        }
      } catch (e) {
        console.error(e);
        showError(t("tagActions.updateNetworkError"));
      }
    }
  };
  const toggleTagFilter = (tagId: string) => {
    setHiddenTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };
  return {
    hiddenTagIds,
    toggleTagFilter,
    handleDeleteTag,
    openAddTag: () => setModal({ type: "create" }),
    openEditTag: (tag: Tag) => setModal({ type: "edit", tag }),
    modalProps: {
      showTagModal: modal?.type === "create",
      editingTag: modal?.type === "edit" ? modal.tag : null,
      onClose: close,
      onEditTag: (tag: Tag) => setModal({ type: "edit", tag }),
      newTagName, setNewTagName, newTagColor, setNewTagColor, handleCreateTag, handleUpdateTag,
    },
  };
}
