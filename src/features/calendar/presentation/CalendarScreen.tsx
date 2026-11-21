"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { notifyDataChanged } from "@/shared/client/cacheSync";
import { OnboardingTour } from "@/shared/ui/OnboardingTour";
import { CalendarItem } from "@/features/calendar/presentation/types";
import { getCalendarSteps } from "@/features/calendar/presentation/calendarUtils";
import { ConfirmationModals } from "@/features/calendar/presentation/components/ConfirmationModals";
import { TagModals } from "@/features/calendar/presentation/components/TagModals";
import { EventFormModal } from "@/features/calendar/presentation/components/EventFormModal";
import { defaultColors } from "@/shared/theme/palettes";
import { TOAST_DURATION, useConfirm, useToast } from "@/shared/ui/components";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { STORAGE_KEYS } from "@/shared/client/storageKeys";
import { SYSTEM_TAG_IDS } from "@/features/calendar/domain/systemTags";
import { buildScheduleItemPayload, type ScheduleItemDraft } from "@/features/calendar/domain/scheduleItemPayload";
import { toDateTimeLocalValue, toOptionalDateTimeLocalValue } from "@/shared/domain/time";
import { emptyScheduleItemDraft } from "@/features/calendar/presentation/scheduleItemForm";
import { useTaskPositions } from "@/features/calendar/presentation/components/useTaskPositions";
import { useCalendarData } from "@/features/calendar/presentation/useCalendarData";
import { useCalendarClipboard } from "@/features/calendar/presentation/useCalendarClipboard";
import { CalendarSidebar } from "@/features/calendar/presentation/components/CalendarSidebar";
import { FloatingNotes } from "@/features/calendar/presentation/components/FloatingNotes";
import { CalendarGrid } from "@/features/calendar/presentation/components/CalendarGrid";
import { useCalendarTags } from "@/features/calendar/presentation/useCalendarTags";

/** Calendar toasts use the longer four-second duration. */
const TOAST_DURATION_MS = TOAST_DURATION.long;

export default function CalendarScreen() {
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const tourSteps = useMemo(() => getCalendarSteps(t), [t]);
  const toast = useToast();
  const confirm = useConfirm();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    id: string;
    isTask: boolean;
    isRecurring: boolean;
  } | null>(null);
  const [saveConfirm, setSaveConfirm] = useState<{
    show: boolean;
    payload: any;
  } | null>(null);
  const showToast = (msg: string) => toast.success(msg, { durationMs: TOAST_DURATION_MS });
  const showError = (msg: string) => toast.error(msg, { durationMs: TOAST_DURATION_MS });
  const showConfirm = async (title: string, message: string, onConfirm: () => void) => {
    const ok = await confirm({ title, message, confirmLabel: t("confirmModal.agree"), tone: "primary" });
    if (ok) onConfirm();
  };
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("week");

  // Modals & Popups
  const [editor, setEditor] = useState<{ type: "create" } | { type: "edit"; item: CalendarItem } | null>(null);
  const editingItem = editor?.type === "edit" ? editor.item : null;
  // Calendar item editor
  const [form, setForm] = useState<ScheduleItemDraft>(() => emptyScheduleItemDraft());
  const patchForm = (patch: Partial<ScheduleItemDraft>) => setForm((prev) => ({ ...prev, ...patch }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Drag-and-drop feedback for task notes
  const [pendingFloatPos, setPendingFloatPos] = useState<{ x: number; y: number } | null>(null);

  // Pinned note positions in localStorage
  const taskPositions = useTaskPositions(STORAGE_KEYS.calendarTaskPositions);
  const { items, tags, setTags, loadData } = useCalendarData(currentDate);
  const { copiedItem, setCopiedItem, selectedSlot, setSelectedSlot, handlePasteEvent } =
    useCalendarClipboard(editingItem, loadData, showToast, showError, showConfirm);
  const tagControls = useCalendarTags(setTags, showToast, showError, showConfirm);
  const handleMonthDayClick = (day: Date) => {
    if (copiedItem) {
      const targetTime = new Date(day);
      targetTime.setHours(12, 0, 0, 0);
      showConfirm(
        t("paste.title"),
        t("paste.confirm", { title: copiedItem.title, when: t("paste.timeOnDate", { time: "12:00", date: format(day, "dd/MM/yyyy") }) }),
        () => handlePasteEvent(targetTime, null)
      );
      return;
    }
    setCurrentDate(day);
    setView("day");
  };
  const executeSave = async (formPayload: any, mode: "one" | "all" | "future") => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // Copy the payload because saveConfirm may still reference it.
    const payload = { ...formPayload };
    try {
      let url: string = form.itemType === "event" ? API_ROUTES.calendar : API_ROUTES.tasks;
      let method = "POST";

      if (editingItem) {
        method = "PATCH";
        url = withQuery(editingItem.isTask ? API_ROUTES.tasks : API_ROUTES.calendar, { mode });
        // "one" and "future" require the occurrence ID. "all" updates the original series.
        payload.id =
          mode === "all" && editingItem.isRecurringInstance ? editingItem.originalId : editingItem.id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedItem = await res.json();
        if (form.itemType === "task" && pendingFloatPos) {
          taskPositions.setPosition(savedItem.id, pendingFloatPos);
          setPendingFloatPos(null);
        }
        setEditor(null);
        clearForm();
        showToast(editingItem ? t("toast.updated") : tc("schedule.created"));
        notifyDataChanged(form.itemType === "event" ? "calendar" : "tasks");
        loadData();
      } else {
        const err = await res.json();
        showError(err.error || t("toast.saveFailed"));
      }
    } catch (e) {
      console.error(e);
      showError(t("toast.saveNetworkError"));
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const payload = buildScheduleItemPayload(form);
    const isRecurring = !!(editingItem && (editingItem.isRecurringInstance || (editingItem.recurrence && editingItem.recurrence !== "NONE")));

    if (isRecurring) {
      setSaveConfirm({
        show: true,
        payload
      });
    } else {
      executeSave(payload, "all");
    }
  };
  const executeDelete = async (id: string, isTask: boolean, mode: "one" | "all" | "future") => {
    try {
      const url = isTask
        ? withQuery(API_ROUTES.tasks, { id, mode })
        : withQuery(API_ROUTES.calendar, { id, mode });
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        setEditor(null);
        showToast(t("toast.deleted"));
        notifyDataChanged(isTask ? "tasks" : "calendar");
        loadData();
      } else {
        const data = await res.json();
        showError(data.error || t("toast.deleteFailed"));
      }
    } catch (e) {
      console.error(e);
      showError(t("toast.deleteNetworkError"));
    }
  };

  const handleDeleteClick = (id: string, isTask: boolean) => {
    const item = items.find(i => i.id === id);
    const isRecurring = !!(item && (item.isRecurringInstance || (item.recurrence && item.recurrence !== "NONE")));
    setDeleteConfirm({
      show: true,
      id,
      isTask,
      isRecurring
    });
  };

  const clearForm = () => {
    setForm(emptyScheduleItemDraft());
    setPendingFloatPos(null);
  };

  /** When creating a note by dragging it from the pad, apply floatPos after clearForm to preserve its drop position. */
  const openCreatePopup = (start: Date | null, end: Date | null, isTaskVal = false, floatPos?: { x: number; y: number }) => {
    if (copiedItem && start) {
      showConfirm(
        t("paste.title"),
        t("paste.confirm", { title: copiedItem.title, when: format(start, "HH:mm, dd/MM/yyyy") }),
        () => handlePasteEvent(start, end)
      );
      return;
    }

    clearForm();
    if (floatPos) setPendingFloatPos(floatPos);
    const defaultTagId = isTaskVal ? "" : SYSTEM_TAG_IDS.event;
    const tag = tags.find(t => t.id === defaultTagId);
    const startVal = start ? toDateTimeLocalValue(start) : "";
    setForm(emptyScheduleItemDraft({
      itemType: isTaskVal ? "task" : "event",
      tagId: defaultTagId,
      noteColor: tag ? tag.color : isTaskVal ? defaultColors.note : defaultColors.event,
      startAt: startVal,
      endAt: end ? toDateTimeLocalValue(end) : "",
      // Tasks with deadlines enable reminders by default. Events start with reminders off.
      notification: isTaskVal && startVal !== "",
    }));
    setEditor({ type: "create" });
  };

  const openEditPopup = (item: CalendarItem) => {
    setForm({
      itemType: item.isTask ? "task" : "event",
      title: item.title,
      description: item.description || "",
      startAt: toOptionalDateTimeLocalValue(item.startAt),
      endAt: toOptionalDateTimeLocalValue(item.endAt),
      allDay: item.allDay,
      tagId: item.tagId || "",
      notification: item.notification,
      noteColor: item.noteColor || item.color || defaultColors.note,
      recurrence: item.recurrence || "NONE",
      recurrenceEnd: toOptionalDateTimeLocalValue(item.recurrenceEnd),
      completed: item.completed || false,
    });
    setEditor({ type: "edit", item });
  };

  const closePopup = () => {
    setEditor(null);
    clearForm();
  };

  const copyFromPopup = (item: CalendarItem) => {
    setCopiedItem(item);
    setEditor(null);
    showToast(t("eventForm.copiedHint", { title: item.title }));
  };
  const handleDropOnPageBackground = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    // Portal events bubble through the React tree even outside this DOM node. Ignore drops inside a modal.
    if (!e.currentTarget.contains(target) || target.closest('.hour-cell') || target.closest('.day-cell') || target.closest('aside')) {
      return;
    }

    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (data === "new-task") {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Center the note on the pointer and leave its deadline empty.
      openCreatePopup(null, null, true, { x: x - 80, y: y - 88 });
    }
  };
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropOnPageBackground}
      className="relative grid grid-cols-12 gap-8 min-h-[80vh] calendar-container"
    >
      <CalendarSidebar currentDate={currentDate} view={view} setCurrentDate={setCurrentDate} tags={tags}
        hiddenTagIds={tagControls.hiddenTagIds} toggleTagFilter={tagControls.toggleTagFilter}
        onAddTag={tagControls.openAddTag} onEditTag={tagControls.openEditTag} handleDeleteTag={tagControls.handleDeleteTag} />
      <CalendarGrid items={items} tags={tags} hiddenTagIds={tagControls.hiddenTagIds} currentDate={currentDate}
        view={view} setView={setView} taskPositions={taskPositions} openEditPopup={openEditPopup}
        openCreatePopup={openCreatePopup} handleMonthDayClick={handleMonthDayClick} selectedSlot={selectedSlot}
        setSelectedSlot={setSelectedSlot} showToast={showToast} />
      <FloatingNotes items={items} taskPositions={taskPositions} hiddenId={editingItem?.id}
        openEditPopup={openEditPopup} loadData={loadData} showToast={showToast} showError={showError} />
      {/* MODAL: EVENT & TASK FORM */}
      <EventFormModal
        open={editor !== null}
        editingItem={editingItem}
        values={form}
        onChange={patchForm}
        tags={tags}
        isSubmitting={isSubmitting}
        onSubmit={handleSave}
        onClose={closePopup}
        onDelete={(item) => handleDeleteClick(item.id, item.isTask || false)}
        onCopy={copyFromPopup}
      />

      <TagModals {...tagControls.modalProps} />
      {/* MODALS: CONFIRMATIONS & DELETIONS */}
      <ConfirmationModals
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        executeDelete={executeDelete}
        saveConfirm={saveConfirm}
        setSaveConfirm={setSaveConfirm}
        executeSave={executeSave}
      />
      <OnboardingTour pageKey="calendar" steps={tourSteps} />
    </div>
  );
}
