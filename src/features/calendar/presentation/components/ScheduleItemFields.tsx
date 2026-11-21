"use client";

import { useTranslations } from "next-intl";
import { colors } from "@/shared/theme/tokens";
import { ColorPicker, Field, FieldLabel, SegmentedControl, TextInput, Textarea } from "@/shared/ui/components";
import type { ScheduleItemDraft } from "@/features/calendar/domain/scheduleItemPayload";
import type { Tag } from "../types";
import { promptNotificationPermission } from "../notificationPermission";
import { startAtPatch, switchItemType, type ScheduleDraftChange } from "../scheduleItemForm";
import { DateTimeInput } from "./DateTimeInput";
import { NotificationToggle } from "./NotificationToggle";
import { RecurrenceFields } from "./RecurrenceFields";
import { TagDropdown } from "./TagDropdown";

interface ScheduleItemFieldsProps {
  values: ScheduleItemDraft;
  onChange: ScheduleDraftChange;
  tags: Tag[];
  /** Allow switching between events and tasks only during creation. */
  showTypeToggle: boolean;
  /** Show the completion checkbox only when editing a task. */
  showCompleted: boolean;
}

/** Fields shared by the calendar editor and the dashboard quick-create form. */
export function ScheduleItemFields({ values, onChange, tags, showTypeToggle, showCompleted }: ScheduleItemFieldsProps) {
  const tc = useTranslations("common");
  const isEvent = values.itemType === "event";

  return (
    <>
      {showTypeToggle && (
        <SegmentedControl
          options={[
            { value: "event", label: tc("schedule.fixedEvent") },
            { value: "task", label: tc("schedule.task") },
          ]}
          value={values.itemType}
          onChange={(type) => onChange(switchItemType(type, values.startAt))}
        />
      )}

      <Field label={tc("schedule.title")}>
        <TextInput
          required
          type="text"
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={tc("schedule.titlePlaceholder")}
        />
      </Field>

      <Field label={isEvent ? tc("schedule.start") : tc("schedule.deadlineOptional")} className="w-full min-w-0">
        <DateTimeInput
          required={isEvent}
          value={values.startAt}
          onChange={(e) => {
            const patch = startAtPatch(values.itemType, e.target.value);
            onChange(patch);
            if (patch.notification) promptNotificationPermission();
          }}
        />
      </Field>

      {isEvent && (
        <Field label={tc("schedule.end")} className="w-full min-w-0">
          <DateTimeInput required value={values.endAt} onChange={(e) => onChange({ endAt: e.target.value })} />
        </Field>
      )}

      <div>
        <FieldLabel>{tc("schedule.tag")}</FieldLabel>
        <TagDropdown tags={tags} value={values.tagId} onSelect={(tagId, noteColor) => onChange({ tagId, noteColor })} />
      </div>

      <RecurrenceFields
        recurrence={values.recurrence}
        onRecurrenceChange={(recurrence) => onChange({ recurrence })}
        recurrenceEnd={values.recurrenceEnd}
        onRecurrenceEndChange={(recurrenceEnd) => onChange({ recurrenceEnd })}
      />

      <div className="flex items-center justify-between border-y border-gray-50 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{tc("schedule.notification")}</span>
          <NotificationToggle value={values.notification} onChange={(notification) => onChange({ notification })} />
        </div>

        {showCompleted && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-gray-400">{tc("action.done")}</span>
            <input
              type="checkbox"
              checked={values.completed}
              onChange={(e) => onChange({ completed: e.target.checked })}
              className="h-5 w-5 cursor-pointer accent-primary"
              aria-label={tc("action.done")}
            />
          </div>
        )}
      </div>

      <div>
        <FieldLabel>{tc("schedule.noteColor")}</FieldLabel>
        <ColorPicker value={values.noteColor || colors.note} onChange={(noteColor) => onChange({ noteColor })} />
      </div>

      <Field label={tc("schedule.note")}>
        <Textarea
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={tc("schedule.descriptionPlaceholder")}
          className="h-24"
        />
      </Field>
    </>
  );
}
