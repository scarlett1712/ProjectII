import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useState } from "react";
import { format, setHours, setMinutes } from "date-fns";
import { notifyDataChanged } from "@/shared/client/cacheSync";
import { apiErrorMessage, apiRequest } from "@/shared/client/api";
import { CalendarItem } from "@/features/calendar/presentation/types";
import { API_ROUTES } from "@/shared/config/routes";

export function useCalendarClipboard(editingItem: CalendarItem | null, loadData: () => void, showToast: (message: string) => void,
  showError: (message: string) => void, showConfirm: (title: string, message: string, action: () => void) => void) {
  const t = useTranslations("calendar");
  const [copiedItem, setCopiedItem] = useState<CalendarItem | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  // useEffectEvent reads the current clipboard item, selection and date without re-registering the listener.
  const onShortcutKey = useEffectEvent((e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.tagName === "SELECT" ||
        activeEl.getAttribute("contenteditable") === "true"
      )) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (editingItem) {
          setCopiedItem(editingItem);
          showToast(t("toast.copied", { title: editingItem.title }));
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (copiedItem && selectedSlot) {
          const targetTime = setMinutes(setHours(selectedSlot.date, selectedSlot.hour), 0);
          showConfirm(
            t("paste.title"),
            t("paste.confirm", { title: copiedItem.title, when: t("paste.timeOnDate", { time: `${String(selectedSlot.hour).padStart(2, "0")}:00`, date: format(selectedSlot.date, "dd/MM/yyyy") }) }),
            () => handlePasteEvent(targetTime, null)
          );
        }
      }
  });

  useEffect(() => {
    window.addEventListener("keydown", onShortcutKey);
    return () => window.removeEventListener("keydown", onShortcutKey);
  }, []);
  async function handlePasteEvent(start: Date, end: Date | null) {
    if (!copiedItem) return;

    const startAt = start.toISOString();
    let endAt = end ? end.toISOString() : start.toISOString();
    if (!copiedItem.isTask) {
      const origStart = new Date(copiedItem.startAt);
      const origEnd = new Date(copiedItem.endAt);
      const durationMs = origEnd.getTime() - origStart.getTime();
      const newEnd = new Date(start.getTime() + durationMs);
      endAt = newEnd.toISOString();
    }

    const payload: any = {
      title: t("paste.copyTitle", { title: copiedItem.title }),
      description: copiedItem.description || "",
      notification: copiedItem.notification,
      noteColor: copiedItem.noteColor,
      color: copiedItem.color,
      tagId: copiedItem.tagId,
    };

    let url: string = API_ROUTES.calendar;
    if (copiedItem.isTask) {
      url = API_ROUTES.tasks;
      payload.dueAt = startAt;
      payload.completed = false;
    } else {
      payload.startAt = startAt;
      payload.endAt = endAt;
      payload.allDay = copiedItem.allDay;
      payload.recurrence = copiedItem.recurrence || "NONE";
      payload.recurrenceEnd = copiedItem.recurrenceEnd;
    }

    try {
      await apiRequest(url, { method: "POST", body: payload });
      showToast(t("paste.pasted", { title: copiedItem.title }));
      setCopiedItem(null);
      notifyDataChanged(copiedItem.isTask ? "tasks" : "calendar");
      loadData();
    } catch (e) {
      showError(apiErrorMessage(e, t("paste.failed")));
    }
  };
  return { copiedItem, setCopiedItem, selectedSlot, setSelectedSlot, handlePasteEvent };
}
