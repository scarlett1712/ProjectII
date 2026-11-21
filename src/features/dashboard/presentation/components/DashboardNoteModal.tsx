"use client";

import { useTranslations } from "next-intl";
import { colors } from "@/shared/theme/tokens";
import { Button, ColorPicker, Field, FieldLabel, Modal, TextInput, Textarea } from "@/shared/ui/components";
import type { ScheduleItemDraft } from "@/features/calendar/domain/scheduleItemPayload";
import type { Tag } from "@/features/calendar/presentation/types";
import { startAtPatch, type ScheduleDraftChange } from "@/features/calendar/presentation/scheduleItemForm";
import { promptNotificationPermission } from "@/features/calendar/presentation/notificationPermission";
import { DateTimeInput } from "@/features/calendar/presentation/components/DateTimeInput";
import { NotificationToggle } from "@/features/calendar/presentation/components/NotificationToggle";
import { RecurrenceFields } from "@/features/calendar/presentation/components/RecurrenceFields";
import { TagDropdown } from "@/features/calendar/presentation/components/TagDropdown";

interface DashboardNoteModalProps {
  open: boolean;
  isEditing: boolean;
  /** Notes always use itemType "task". startAt holds the deadline. */
  values: ScheduleItemDraft;
  onChange: ScheduleDraftChange;
  tags: Tag[];
  isSubmitting: boolean;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Edit a task note pinned to Dashboard. */
export function DashboardNoteModal({
  open,
  isEditing,
  values,
  onChange,
  tags,
  isSubmitting,
  onSave,
  onDelete,
  onClose,
}: DashboardNoteModalProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? t("noteModal.editTitle") : t("noteModal.addTitle")}
      size="lg"
      footer={
        <>
          {isEditing && (
            <Button variant="danger" onClick={onDelete}>
              {tc("action.delete")}
            </Button>
          )}
          <Button className="flex-1" onClick={onSave} loading={isSubmitting} loadingText={tc("action.saving")}>
            {t("noteModal.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label={tc("schedule.title")}>
          <TextInput
            required
            type="text"
            value={values.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={tc("finance.notePlaceholder")}
          />
        </Field>

        <Field label={tc("schedule.deadlineOptional")} className="w-full min-w-0">
          <DateTimeInput
            value={values.startAt}
            onChange={(e) => {
              const patch = startAtPatch("task", e.target.value);
              onChange(patch);
              if (patch.notification) promptNotificationPermission();
            }}
          />
        </Field>

        <div className="flex items-center justify-between border-y border-gray-50 py-2">
          <FieldLabel className="mb-0">{tc("schedule.notification")}</FieldLabel>
          <NotificationToggle
            variant="switch"
            value={values.notification}
            onChange={(notification) => onChange({ notification })}
            ariaLabel={t("noteModal.toggleNotification")}
          />
        </div>

        <RecurrenceFields
          recurrence={values.recurrence}
          onRecurrenceChange={(recurrence) => onChange({ recurrence })}
          recurrenceEnd={values.recurrenceEnd}
          onRecurrenceEndChange={(recurrenceEnd) => onChange({ recurrenceEnd })}
        />

        <div>
          <FieldLabel>{tc("schedule.tag")}</FieldLabel>
          <TagDropdown tags={tags} value={values.tagId} onSelect={(tagId, noteColor) => onChange({ tagId, noteColor })} />
        </div>

        <div>
          <FieldLabel>{t("noteModal.noteColor")}</FieldLabel>
          <ColorPicker value={values.noteColor || colors.note} onChange={(noteColor) => onChange({ noteColor })} />
        </div>

        <Field label={tc("schedule.note")}>
          <Textarea
            value={values.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder={t("noteModal.contentPlaceholder")}
            className="h-24"
          />
        </Field>
      </div>
    </Modal>
  );
}
