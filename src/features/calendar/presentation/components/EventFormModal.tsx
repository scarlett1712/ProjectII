"use client";

import { useTranslations } from "next-intl";
import type { ScheduleItemDraft } from "@/features/calendar/domain/scheduleItemPayload";
import { Button, Modal } from "@/shared/ui/components";
import type { CalendarItem, Tag } from "../types";
import type { ScheduleDraftChange } from "../scheduleItemForm";
import { ScheduleItemFields } from "./ScheduleItemFields";

interface EventFormModalProps {
  open: boolean;
  /** Item being edited, or null when creating one. */
  editingItem: CalendarItem | null;
  values: ScheduleItemDraft;
  onChange: ScheduleDraftChange;
  tags: Tag[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onDelete: (item: CalendarItem) => void;
  onCopy: (item: CalendarItem) => void;
}

/** Calendar form for creating or editing events and tasks. */
export function EventFormModal({
  open,
  editingItem,
  values,
  onChange,
  tags,
  isSubmitting,
  onSubmit,
  onClose,
  onDelete,
  onCopy,
}: EventFormModalProps) {
  const t = useTranslations("calendar");
  const tc = useTranslations("common");

  return (
    <Modal open={open} onClose={onClose} title={editingItem ? t("eventForm.editTitle") : tc("schedule.createTitle")} size="lg">
      <form onSubmit={onSubmit} className="space-y-5">
        <ScheduleItemFields
          values={values}
          onChange={onChange}
          tags={tags}
          showTypeToggle={!editingItem}
          showCompleted={values.itemType === "task" && !!editingItem}
        />

        <div className="flex gap-3 pt-3">
          {editingItem && (
            <>
              <Button variant="danger" size="lg" onClick={() => onDelete(editingItem)}>
                {tc("action.delete")}
              </Button>
              <Button variant="secondary" size="lg" onClick={() => onCopy(editingItem)}>
                {t("eventForm.copy")}
              </Button>
            </>
          )}
          <Button type="submit" size="lg" className="flex-1" loading={isSubmitting} loadingText={tc("action.saving")}>
            {tc("action.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
