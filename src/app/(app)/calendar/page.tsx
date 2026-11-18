"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  format, 
  addDays, 
  subDays, 
  addWeeks, 
  subWeeks, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  parseISO, 
  setHours, 
  setMinutes 
} from "date-fns";
import { vi } from "date-fns/locale";
import { registerPushSubscription } from "@/lib/clientNotifications";
import { fetchWithCache, notifyDataChanged } from "@/lib/cacheSync";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Plus, 
  Trash2, 
  Clock, 
  Bell, 
  BellOff, 
  Check, 
  StickyNote,
  Calendar as CalendarIcon,
  X,
  AlertCircle,
  Pencil
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { OnboardingTour } from "@/components/OnboardingTour";
import { Tag, CalendarItem } from "@/components/calendar/types";
import {
  calendarSteps,
  boldColors,
  pastelColors,
  getEventLayoutStyles,
  getContrastTextColor,
  getContrastTextColorForEvent,
  getTagStyles,
} from "@/components/calendar/calendarUtils";
import { ConfirmationModals } from "@/components/calendar/ConfirmationModals";
import { TagModals } from "@/components/calendar/TagModals";
import { EventFormModal } from "@/components/calendar/EventFormModal";

export default function CalendarPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const draggedTaskIdRef = useRef<string | null>(null);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [copiedItem, setCopiedItem] = useState<CalendarItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
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
  const [hiddenHours, setHiddenHours] = useState<number[]>([]);
  // isMounted as state (not ref) so the save-effect only fires AFTER setHiddenHours
  // has caused a re-render with the loaded values, preventing overwriting localStorage with [].
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("calendar-hidden-hours");
    if (stored) {
      try {
        setHiddenHours(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem("calendar-hidden-hours", JSON.stringify(hiddenHours));
  }, [hiddenHours, isMounted]);

  // Tag overrides for system tags (stored in localStorage)
  const [tagOverrides, setTagOverrides] = useState<Record<string, { name: string; color: string }>>({});
  const [editingTag, setEditingTag] = useState<{ id: string; name: string; color: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("calendar-tag-overrides");
    if (stored) {
      try { setTagOverrides(JSON.parse(stored)); } catch {}
    }
  }, []);
  const [hourMenu, setHourMenu] = useState<{ hour: number; x: number; y: number } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      }
    });
  };
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("week");
  
  // Modals & Popups
  const [showPopup, setShowPopup] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
  const [showEditTagModal, setShowEditTagModal] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState<"event" | "task">("event");
  const [startAtStr, setStartAtStr] = useState("");
  const [endAtStr, setEndAtStr] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [notification, setNotification] = useState(false);
  const [noteColor, setNoteColor] = useState("#fdfd96"); // Yellow default
  const [recurrence, setRecurrence] = useState("NONE");
  const [recurrenceEndStr, setRecurrenceEndStr] = useState("");
  const [completed, setCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tag creation form
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#8B5CF6");

  // Drag selection state for time grid
  const [dragStart, setDragStart] = useState<{ date: Date; hour: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ date: Date; hour: number } | null>(null);
  const [isDraggingGrid, setIsDraggingGrid] = useState(false);

  // Drag-and-drop feedback for task notes
  const [isDraggingTaskFromSidebar, setIsDraggingTaskFromSidebar] = useState(false);
  const [pendingFloatPos, setPendingFloatPos] = useState<{ x: number; y: number } | null>(null);

  // Load dragged positions from localStorage
  const [taskPositions, setTaskPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const saved = localStorage.getItem("calendar-task-positions");
    if (saved) {
      try {
        setTaskPositions(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          showToast(`Đã sao chép "${editingItem.title}"!`);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (copiedItem && selectedSlot) {
          const targetTime = setMinutes(setHours(selectedSlot.date, selectedSlot.hour), 0);
          showConfirm(
            "Dán lịch trình",
            `Bạn có muốn sao chép và dán sự kiện "${copiedItem.title}" vào lúc ${String(selectedSlot.hour).padStart(2, "0")}:00 ngày ${format(selectedSlot.date, "dd/MM/yyyy")} không?`,
            () => handlePasteEvent(targetTime, null)
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [copiedItem, selectedSlot, editingItem]);

  const handleTaskDragEnd = (taskId: string, info: any) => {
    const current = taskPositions[taskId] || { x: 200, y: 100 };
    const updated = {
      ...taskPositions,
      [taskId]: {
        x: current.x + info.offset.x,
        y: current.y + info.offset.y
      }
    };
    setTaskPositions(updated);
    localStorage.setItem("calendar-task-positions", JSON.stringify(updated));
  };

  const handleInlineTaskDragEnd = (e: any, info: any, task: CalendarItem, containerClass: string) => {
    // If the task is completed, do not allow dragging out into a note
    if (task.completed) {
      return;
    }

    // If the drag offset is very small, treat it as a click/tap (don't float it)
    if (Math.abs(info.offset.x) < 10 && Math.abs(info.offset.y) < 10) {
      return;
    }
    
    const cardEl = (e.target as HTMLElement).closest('.task-card-ref');
    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();
    
    const parent = document.querySelector(containerClass);
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    
    // Calculate coordinates relative to parent container
    const x = rect.left - parentRect.left;
    const y = rect.top - parentRect.top;
    
    const updated = {
      ...taskPositions,
      [task.id]: { x, y }
    };
    setTaskPositions(updated);
    localStorage.setItem("calendar-task-positions", JSON.stringify(updated));
  };

  const getAbsolutePosition = (item: CalendarItem, day: Date) => {
    const start = new Date(item.startAt);
    const end = new Date(item.endAt || item.startAt);
    
    let startHour = 0;
    let endHour = 24;
    
    if (isSameDay(start, day)) {
      startHour = start.getHours() + start.getMinutes() / 60;
    }
    if (isSameDay(end, day)) {
      endHour = end.getHours() + end.getMinutes() / 60;
    } else if (item.isTask) {
      endHour = startHour + 1.0;
    }
    
    if (endHour <= startHour) {
      endHour = startHour + 1.0;
    }
    
    // Adjust top and height based on hiddenHours
    let top = 0;
    const startHourFloor = Math.floor(startHour);
    for (let h = 0; h < startHourFloor; h++) {
      if (!hiddenHours.includes(h)) {
        top += 50;
      }
    }
    if (!hiddenHours.includes(startHourFloor)) {
      const fraction = startHour - startHourFloor;
      top += fraction * 50;
    }

    let height = 0;
    const startFloor = Math.floor(startHour);
    const endCeil = Math.ceil(endHour);
    for (let h = startFloor; h < endCeil; h++) {
      if (!hiddenHours.includes(h)) {
        const overlapStart = Math.max(startHour, h);
        const overlapEnd = Math.min(endHour, h + 1);
        const overlap = overlapEnd - overlapStart;
        if (overlap > 0) {
          height += overlap * 50;
        }
      }
    }
    height = Math.max(15, height);

    const isVisible = !hiddenHours.includes(startHourFloor);
    
    return {
      top,
      height,
      visible: isVisible
    };
  };

  const handleMonthDayClick = (day: Date) => {
    if (copiedItem) {
      const targetTime = new Date(day);
      targetTime.setHours(12, 0, 0, 0);
      showConfirm(
        "Dán lịch trình",
        `Bạn có muốn sao chép và dán sự kiện "${copiedItem.title}" vào lúc 12:00 ngày ${format(day, "dd/MM/yyyy")} không?`,
        () => handlePasteEvent(targetTime, null)
      );
      return;
    }
    setCurrentDate(day);
    setView("day");
  };

  const loadData = async () => {
    try {
      // Merge system tag overrides helper
      const applyTagOverrides = (tagData: Tag[]) => {
        let overrides: Record<string, { name: string; color: string }> = {};
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("calendar-tag-overrides");
          if (stored) {
            try { overrides = JSON.parse(stored); } catch {}
          }
        }
        return (tagData || []).map((t: Tag) => {
          if (t.id.startsWith("system-") && overrides[t.id]) {
            return { ...t, ...overrides[t.id] };
          }
          return t;
        });
      };

      // Load tags with Instant Cache
      fetchWithCache<Tag[]>("/api/tags", undefined, {
        onInstant: (cached) => {
          const merged = applyTagOverrides(cached);
          setTags(merged);
          if (selectedTags.length === 0) setSelectedTags(merged.map((t) => t.id));
        },
        onFresh: (fresh) => {
          const merged = applyTagOverrides(fresh);
          setTags(merged);
          if (selectedTags.length === 0) setSelectedTags(merged.map((t) => t.id));
        },
      }).catch(console.error);

      // Load calendar events
      const startRange = startOfMonth(subMonths(currentDate, 2)).toISOString();
      const endRange = endOfMonth(addMonths(currentDate, 4)).toISOString();
      const calUrl = `/api/calendar?start=${startRange}&end=${endRange}`;

      const updateItems = (calList: any[], taskList: any[]) => {
        const formattedTasks = (taskList || []).map((task: any) => ({
          ...task,
          isTask: true,
          startAt: task.dueAt || task.createdAt,
          endAt: task.dueAt || task.createdAt,
          tagId: task.tagId || null
        }));
        setItems([...(calList || []), ...formattedTasks]);
      };

      let currentCal: any[] = [];
      let currentTasks: any[] = [];

      fetchWithCache<any[]>(calUrl, undefined, {
        onInstant: (cached) => {
          currentCal = cached || [];
          updateItems(currentCal, currentTasks);
        },
        onFresh: (fresh) => {
          currentCal = fresh || [];
          updateItems(currentCal, currentTasks);
        },
      }).catch(console.error);

      fetchWithCache<any[]>("/api/tasks", undefined, {
        onInstant: (cached) => {
          currentTasks = cached || [];
          updateItems(currentCal, currentTasks);
        },
        onFresh: (fresh) => {
          currentTasks = fresh || [];
          updateItems(currentCal, currentTasks);
        },
      }).catch(console.error);

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = (e: Event) => {
      const ce = e as CustomEvent<{ domain: string }>;
      const d = ce.detail?.domain;
      if (!d || d === "all" || d === "calendar" || d === "tasks") {
        loadData();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "app-sync-trigger") {
        loadData();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadData();
      }
    };

    window.addEventListener("app-data-sync", handleSync);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("app-data-sync", handleSync);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentDate]);

  const executeSave = async (payload: any, mode: "one" | "all" | "future") => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let url = itemType === "event" ? "/api/calendar" : "/api/tasks";
      let method = "POST";
      
      if (editingItem) {
        method = "PATCH";
        if (editingItem.isTask) {
          url = `/api/tasks?mode=${mode}`;
          if (mode === "one" || mode === "future") {
            payload.id = editingItem.id;
          } else {
            payload.id = editingItem.isRecurringInstance ? editingItem.originalId : editingItem.id;
          }
        } else {
          url = `/api/calendar?mode=${mode}`;
          if (mode === "one" || mode === "future") {
            payload.id = editingItem.id;
          } else {
            payload.id = editingItem.isRecurringInstance ? editingItem.originalId : editingItem.id;
          }
        }
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedItem = await res.json();
        if (itemType === "task" && pendingFloatPos) {
          const updated = {
            ...taskPositions,
            [savedItem.id]: pendingFloatPos
          };
          setTaskPositions(updated);
          localStorage.setItem("calendar-task-positions", JSON.stringify(updated));
          setPendingFloatPos(null);
        }
        setShowPopup(false);
        setEditingItem(null);
        clearForm();
        showToast(editingItem ? "Đã cập nhật lịch trình!" : "Đã tạo lịch trình mới!");
        notifyDataChanged(itemType === "event" ? "calendar" : "tasks");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Lỗi khi lưu.");
      }
    } catch (e) {
      console.error(e);
      showToast("Lỗi kết nối khi lưu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      notification,
      noteColor,
      color: noteColor, // Ensure color is saved in DB
      tagId: selectedTagId || null
    };

    if (itemType === "event") {
      payload.startAt = new Date(startAtStr).toISOString();
      payload.endAt = new Date(endAtStr).toISOString();
      payload.allDay = allDay;
    } else {
      payload.dueAt = startAtStr ? new Date(startAtStr).toISOString() : null; // Optional deadline!
      payload.completed = completed;
    }
    payload.recurrence = recurrence;
    payload.recurrenceEnd = recurrenceEndStr ? new Date(recurrenceEndStr).toISOString() : null;

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
      title: copiedItem.title + " (Copy)",
      description: copiedItem.description || "",
      notification: copiedItem.notification,
      noteColor: copiedItem.noteColor,
      color: copiedItem.color,
      tagId: copiedItem.tagId,
    };

    let url = "/api/calendar";
    if (copiedItem.isTask) {
      url = "/api/tasks";
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
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(`Đã dán lịch trình "${copiedItem.title}"!`);
        setCopiedItem(null);
        notifyDataChanged(copiedItem.isTask ? "tasks" : "calendar");
        loadData();
      }
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi dán lịch trình.");
    }
  };

  const executeDelete = async (id: string, isTask: boolean, mode: "one" | "all" | "future") => {
    try {
      const url = isTask 
        ? `/api/tasks?id=${id}&mode=${mode}` 
        : `/api/calendar?id=${id}&mode=${mode}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        setShowPopup(false);
        setEditingItem(null);
        showToast("Đã xóa thành công!");
        notifyDataChanged(isTask ? "tasks" : "calendar");
        loadData();
      } else {
        const data = await res.json();
        showToast(data.error || "Lỗi khi xóa.");
      }
    } catch (e) {
      console.error(e);
      showToast("Lỗi kết nối khi xóa.");
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

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName, color: newTagColor })
      });
      if (res.ok) {
        const newTag = await res.json();
        setTags(prev => [...prev, newTag]);
        setSelectedTags(prev => [...prev, newTag.id]);
        setNewTagName("");
        setShowTagModal(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (tagId.startsWith("system-")) {
      showToast("Không thể xóa nhãn hệ thống!");
      return;
    }
    showConfirm(
      "Xóa nhãn",
      "Xóa nhãn này sẽ đưa các lịch có nhãn này về Nhãn mặc định. Xác nhận xóa?",
      async () => {
        try {
          const res = await fetch(`/api/tags?id=${tagId}`, { method: "DELETE" });
          if (res.ok) {
            setTags(prev => prev.filter(t => t.id !== tagId));
            setSelectedTags(prev => prev.filter(id => id !== tagId));
            showToast("Đã xóa nhãn thành công.");
          }
        } catch (e) {
          console.error(e);
          showToast("Lỗi khi xóa nhãn.");
        }
      }
    );
  };

  const handleUpdateTag = async (tagId: string, name: string, color: string) => {
    if (tagId.startsWith("system-")) {
      // System tags: save override to localStorage and update local state
      const newOverrides = { ...tagOverrides, [tagId]: { name, color } };
      setTagOverrides(newOverrides);
      localStorage.setItem("calendar-tag-overrides", JSON.stringify(newOverrides));
      setTags(prev => prev.map(t => t.id === tagId ? { ...t, name, color } : t));
      setEditingTag(null);
      setShowEditTagModal(false);
      showToast("Đã cập nhật nhãn thành công.");
    } else {
      try {
        const res = await fetch("/api/tags", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: tagId, name, color })
        });
        if (res.ok) {
          setTags(prev => prev.map(t => t.id === tagId ? { ...t, name, color } : t));
          setEditingTag(null);
          setShowEditTagModal(false);
          showToast("Đã cập nhật nhãn thành công.");
        } else {
          showToast("Lỗi khi cập nhật nhãn.");
        }
      } catch (e) {
        console.error(e);
        showToast("Lỗi kết nối khi cập nhật nhãn.");
      }
    }
  };

  const clearForm = () => {
    setTitle("");
    setDescription("");
    setItemType("event");
    setStartAtStr("");
    setEndAtStr("");
    setAllDay(false);
    setSelectedTagId("");
    setNotification(false);
    setNoteColor("#fdfd96");
    setRecurrence("NONE");
    setRecurrenceEndStr("");
    setCompleted(false);
    setPendingFloatPos(null);
    setTagDropdownOpen(false);
  };

  const openCreatePopup = (start: Date | null, end: Date | null, isTaskVal = false) => {
    if (copiedItem && start) {
      showConfirm(
        "Dán lịch trình",
        `Bạn có muốn sao chép và dán sự kiện "${copiedItem.title}" vào lúc ${format(start, "HH:mm, dd/MM/yyyy")} không?`,
        () => handlePasteEvent(start, end)
      );
      return;
    }

    clearForm();
    setEditingItem(null);
    setItemType(isTaskVal ? "task" : "event");
    const defaultTagId = isTaskVal ? "" : "system-event";
    setSelectedTagId(defaultTagId);
    
    const tag = tags.find(t => t.id === defaultTagId);
    if (tag) {
      setNoteColor(tag.color);
    } else {
      setNoteColor(isTaskVal ? "#fdfd96" : "#8B5CF6");
    }
    
    // Format local date-time string for input type="datetime-local"
    const formatLocal = (d: Date) => {
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60 * 1000);
      return local.toISOString().slice(0, 16);
    };

    const startVal = start ? formatLocal(start) : "";
    setStartAtStr(startVal);
    setEndAtStr(end ? formatLocal(end) : "");
    if (isTaskVal) {
      setNotification(startVal !== "");
    } else {
      setNotification(false);
    }
    setShowPopup(true);
  };

  const openEditPopup = (item: CalendarItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setItemType(item.isTask ? "task" : "event");
    setSelectedTagId(item.tagId || "");
    setNotification(item.notification);
    setNoteColor(item.noteColor || item.color || "#fdfd96");
    setCompleted(item.completed || false);

    const formatLocal = (isoStr: string) => {
      const d = new Date(isoStr);
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60 * 1000);
      return local.toISOString().slice(0, 16);
    };

    setStartAtStr(item.startAt ? formatLocal(item.startAt) : "");
    setEndAtStr(item.endAt ? formatLocal(item.endAt) : "");
    setAllDay(item.allDay);
    setRecurrence(item.recurrence || "NONE");
    setRecurrenceEndStr(item.recurrenceEnd ? formatLocal(item.recurrenceEnd) : "");
    setShowPopup(true);
  };

  // Drag selection on grid
  const handleGridMouseDown = (date: Date, hour: number) => {
    setIsDraggingGrid(true);
    setDragStart({ date, hour });
    setDragCurrent({ date, hour });
    setSelectedSlot({ date, hour });
  };

  const handleGridMouseEnter = (date: Date, hour: number) => {
    if (isDraggingGrid) {
      setDragCurrent({ date, hour });
    }
  };

  const handleGridMouseUp = () => {
    if (isDraggingGrid && dragStart && dragCurrent) {
      setIsDraggingGrid(false);
      
      const startH = Math.min(dragStart.hour, dragCurrent.hour);
      const endH = Math.max(dragStart.hour, dragCurrent.hour) + 1; // span to end of hour

      const start = setMinutes(setHours(dragStart.date, startH), 0);
      const end = setMinutes(setHours(dragStart.date, endH), 0);
      
      openCreatePopup(start, end);
      setDragStart(null);
      setDragCurrent(null);
    }
  };

  // Note Pad Tear-and-Drag Logic
  const handleDragStartTaskPad = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", "new-task");
    setIsDraggingTaskFromSidebar(true);
  };

  const handleDragEndTaskPad = () => {
    setIsDraggingTaskFromSidebar(false);
  };

  const handleDropOnGrid = (e: React.DragEvent, date: Date, hour: number = 12) => {
    e.preventDefault();
    setIsDraggingTaskFromSidebar(false);
    const data = e.dataTransfer.getData("text/plain");
    if (data === "new-task") {
      const start = setMinutes(setHours(date, hour), 0);
      const end = setMinutes(setHours(date, hour + 1), 0);
      
      const container = document.querySelector(".calendar-container");
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setPendingFloatPos({ x: x - 80, y: y - 88 });
      }
      
      openCreatePopup(start, end, true);
    }
  };

  const handleDropOnPageBackground = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.hour-cell') || target.closest('.day-cell') || target.closest('aside') || target.closest('.popup-dialog')) {
      return;
    }
    
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (data === "new-task") {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setPendingFloatPos({ x: x - 80, y: y - 88 }); // Center the note relative to cursor
      openCreatePopup(null, null, true); // No pre-filled due date by default!
    }
  };

  // Check deadline status for task dot colors
  const getTaskStatus = (dueAtStr: string, isCompleted: boolean) => {
    if (isCompleted) return "completed";
    if (!dueAtStr) return "normal";
    const diff = new Date(dueAtStr).getTime() - new Date().getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 0 || hours < 2) return "critical"; // Red
    if (hours < 24) return "warning"; // Blue
    return "normal"; // Green
  };

  const getStatusDotColor = (status: string) => {
    if (status === "completed") return "bg-gray-400";
    if (status === "critical") return "bg-[#F87171]";
    if (status === "warning") return "bg-[#93C5FD]";
    return "bg-[#A7F3D0]";
  };

  const getTaskBgColor = (item: CalendarItem): string | undefined => {
    const DEFAULT_YELLOWS = ["#fcd34d", "#fdfd96", "#fef3c7"];
    const isCustomColor = item.noteColor && !DEFAULT_YELLOWS.includes(item.noteColor.toLowerCase());
    if (isCustomColor) {
      return item.noteColor || undefined;
    }
    if (item.completed) return "#F3F4F6"; // Gray for completed
    return "#fdfd96"; // Bright sticky-note yellow (matches dashboard)
  };

  // Event block styling helper (fully filled with pastel opacity + left border accent)
  const getEventStyle = (item: CalendarItem) => {
    const tagColor = tags.find(t => t.id === item.tagId)?.color || "#A172FD";
    const baseColor = item.color || item.noteColor || tagColor;
    return {
      backgroundColor: baseColor + "1E", // 12% opacity
      border: `1px solid ${baseColor}33`,
      borderLeft: `4px solid ${baseColor}`,
      color: getContrastTextColorForEvent(baseColor),
    };
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (!item.tagId) return true; // Items without a tag are always shown
    return selectedTags.includes(item.tagId);
  });

  // Calendar calculations
  const startRange = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
  const endRange = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
  const daysInMonth = eachDayOfInterval({ start: startRange, end: endRange });

  const weekDays = eachDayOfInterval({ 
    start: startOfWeek(currentDate, { weekStartsOn: 1 }), 
    end: endOfWeek(currentDate, { weekStartsOn: 1 }) 
  });

  const toggleTagFilter = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropOnPageBackground}
      className="relative grid grid-cols-12 gap-8 min-h-[80vh] calendar-container"
    >
      
      {/* LEFT SIDEBAR */}
      <aside className="col-span-12 lg:col-span-3 space-y-6 bg-white/60 p-6 rounded-3xl border border-white/20 backdrop-blur-md shadow-sm">
        {/* Navigation Date Picker */}
        <div id="tour-cal-nav" className="text-center">
          <CalendarIcon className="h-10 w-10 text-[#A172FD] mx-auto mb-2" />
          <h2 className="text-xl font-bold text-gray-800 capitalize">
            {format(currentDate, "MMMM yyyy", { locale: vi })}
          </h2>
          <div className="flex justify-center gap-2 mt-3">
            <button 
              onClick={() => setCurrentDate(prev => view === "month" ? subMonths(prev, 1) : view === "week" ? subWeeks(prev, 1) : subDays(prev, 1))} 
              className="p-2 rounded-full hover:bg-purple-100/50 text-[#A172FD] transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())} 
              className="px-4 py-1.5 rounded-full bg-[#F5F3FF] text-[#A172FD] font-bold text-xs hover:bg-[#A172FD] hover:text-white transition-colors"
            >
              Hôm nay
            </button>
            <button 
              onClick={() => setCurrentDate(prev => view === "month" ? addMonths(prev, 1) : view === "week" ? addWeeks(prev, 1) : addDays(prev, 1))} 
              className="p-2 rounded-full hover:bg-purple-100/50 text-[#A172FD] transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* DRAGGABLE TASK PAD */}
        <div id="tour-cal-task-pad" className="space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Tập giấy Note</h3>
          <p className="text-xs text-gray-500">Xé một tờ giấy công việc dưới đây và kéo thả vào lịch thời gian mong muốn:</p>
          <div className="flex justify-center py-2">
            <div
              draggable
              onDragStart={handleDragStartTaskPad}
              onDragEnd={handleDragEndTaskPad}
              className="relative cursor-grab active:cursor-grabbing w-36 h-36 bg-[#fdfd96] p-4 shadow-md rounded-br-[36px] border border-yellow-200/50 flex flex-col justify-between hover:shadow-lg transition-all transform hover:scale-105 hover:-rotate-2"
            >
              {/* Paper line lines */}
              <div className="space-y-2">
                <div className="h-1 bg-black/5 rounded w-full" />
                <div className="h-1 bg-black/5 rounded w-5/6" />
                <div className="h-1 bg-black/5 rounded w-4/5" />
              </div>
              <p className="text-[10px] font-bold text-[#b45309] text-center uppercase tracking-wider select-none">
                ✍️ Kéo thả để tạo Task
              </p>
              {/* Peeling corner */}
              <div className="absolute bottom-0 right-0 h-8 w-8 rounded-tl-xl bg-black/5" />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* TAG MANAGEMENT */}
        <div id="tour-cal-tags" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Nhãn phân loại</h3>
            <button 
              onClick={() => setShowTagModal(true)} 
              className="p-1 rounded-lg bg-purple-50 text-[#A172FD] hover:bg-[#A172FD] hover:text-white transition-colors"
              title="Thêm nhãn mới"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between group">
                <button 
                  onClick={() => toggleTagFilter(tag.id)}
                  className="flex-1 flex items-center gap-3 py-1.5 px-2 rounded-xl hover:bg-purple-50/50 text-left transition-colors"
                >
                  <span 
                    className="w-4 h-4 rounded-full border flex items-center justify-center transition-colors"
                    style={{ borderColor: tag.color, backgroundColor: selectedTags.includes(tag.id) ? tag.color : "transparent" }}
                  >
                    {selectedTags.includes(tag.id) && <Check className="h-2.5 w-2.5 text-white" />}
                  </span>
                  <span className="text-sm font-bold text-gray-700">{tag.name}</span>
                </button>
                
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
                  {/* Edit button — available for all tags including system ones */}
                  <button 
                    onClick={() => {
                      setEditingTag({ id: tag.id, name: tag.name, color: tag.color });
                      setShowEditTagModal(true);
                    }}
                    className="p-1 text-gray-400 hover:text-[#A172FD] rounded-lg hover:bg-purple-50 transition-all"
                    title="Sửa nhãn"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  {/* Delete button — only for non-system tags */}
                  {!tag.isSystem && (
                    <button 
                      onClick={() => handleDeleteTag(tag.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                      title="Xóa nhãn"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* MAIN CALENDAR GRID */}
      <main className="col-span-12 lg:col-span-9 bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col min-h-[600px]">
        {/* Main Grid Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
          <div id="tour-cal-views" className="flex items-center gap-2 bg-[#F5F3FF] p-1 rounded-full text-xs font-bold shadow-sm">
            {(["month", "week", "day"] as const).map(v => (
              <button 
                key={v} 
                onClick={() => setView(v)} 
                className={`px-5 py-2 rounded-full transition-all capitalize ${view === v ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280] hover:text-[#A172FD]"}`}
              >
                {v === "month" ? "Tháng" : v === "week" ? "Tuần" : "Ngày"}
              </button>
            ))}
          </div>

          <button 
            onClick={() => {
              const start = new Date();
              const end = new Date(start.getTime() + 60 * 60 * 1000);
              openCreatePopup(start, end);
            }}
            className="flex items-center gap-2 bg-[#A172FD] text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-[#8b5cf6] transition-colors shadow-sm self-stretch sm:self-auto justify-center"
          >
            <Plus className="h-4 w-4" />
            Tạo mới
          </button>
        </div>

        {/* CALENDAR VIEWS */}
        <div className="flex-1 overflow-x-auto min-h-[500px]">
          {view === "month" && (
            <div className="min-w-[600px] h-full grid grid-cols-7 gap-1">
              {/* Day headers */}
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(day => (
                <div key={day} className="text-center font-bold text-xs text-gray-400 py-2 uppercase">{day}</div>
              ))}
              
              {/* Day cells */}
              {daysInMonth.map((day, i) => {
                // Filter out floating tasks so they don't render in cell, except completed ones
                const dayItems = filteredItems.filter(item => isSameDay(parseISO(item.startAt), day) && (!item.isTask || !taskPositions[item.id] || item.completed));
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div 
                    key={i} 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnGrid(e, day)}
                    onClick={() => handleMonthDayClick(day)}
                    className={`min-h-[100px] border border-gray-50 p-2 rounded-2xl flex flex-col justify-between transition-colors cursor-pointer group ${
                      isCurrentMonth ? "bg-white" : "bg-gray-50/50 opacity-40"
                    } ${isToday ? "ring-2 ring-[#A172FD]/20 bg-purple-50/20" : "hover:bg-purple-50/10"}`}
                  >
                    <span className={`text-xs font-black self-end px-2 py-0.5 rounded-full ${
                      isToday ? "bg-[#A172FD] text-white" : "text-gray-600"
                    }`}>
                      {format(day, "d")}
                    </span>

                    {/* Day events/tasks list */}
                    <div className="space-y-1.5 mt-2 flex-1 overflow-y-auto max-h-[120px] scrollbar-thin">
                      {dayItems.map(item => {
                        if (item.isTask) {
                          const status = getTaskStatus(item.dueAt || "", item.completed || false);
                          return (
                            <motion.div 
                              key={item.id}
                              drag={!item.completed}
                              dragMomentum={false}
                              dragElastic={0}
                              onDragStart={() => {
                                if (item.completed) return;
                                draggedTaskIdRef.current = item.id;
                              }}
                              onDragEnd={(e, info) => {
                                if (item.completed) return;
                                handleInlineTaskDragEnd(e, info, item, '.calendar-container');
                                setTimeout(() => {
                                  draggedTaskIdRef.current = null;
                                }, 50);
                              }}
                              onTap={() => {
                                if (draggedTaskIdRef.current === item.id) return;
                                openEditPopup(item);
                              }}
                              style={{ 
                                backgroundColor: getTaskBgColor(item),
                                x: 0,
                                y: 0,
                                opacity: item.completed ? 0.5 : 1
                              }}
                              className={`text-[10px] p-1.5 rounded-lg shadow-sm border border-yellow-200/25 flex items-center justify-between gap-1 select-none task-card-ref ${
                                item.completed ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
                              }`}
                            >
                              <span className={`font-bold text-gray-800 truncate flex-1 ${item.completed ? "line-through opacity-50" : ""}`}>
                                📌 {item.title}
                              </span>
                              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${getStatusDotColor(status)}`} />
                            </motion.div>
                          );
                        } else {
                          return (
                            <div 
                              key={item.id}
                              onClick={(e) => { e.stopPropagation(); openEditPopup(item); }}
                              style={getEventStyle(item)}
                              className="text-[10px] font-bold px-2 py-1 rounded-r-lg truncate hover:brightness-95 transition-all"
                            >
                              {item.title}
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(view === "week" || view === "day") && (
            <div className="min-w-[600px] h-full flex flex-col" onMouseLeave={handleGridMouseUp}>
              {/* Day headers */}
              <div className="grid grid-cols-8 border-b border-gray-100 py-3">
                <div 
                  onClick={() => {
                    if (hiddenHours.length > 0) {
                      setHiddenHours([]);
                      showToast("Đã hiện lại tất cả các hàng.");
                    }
                  }}
                  className={`col-span-1 text-center text-xs font-bold text-gray-400 ${hiddenHours.length > 0 ? "cursor-pointer text-[#A172FD] underline" : ""}`}
                >
                  {hiddenHours.length > 0 ? `Hiện (${hiddenHours.length})` : "Giờ"}
                </div>
                {view === "week" ? weekDays.map((day, i) => (
                  <div key={i} className="col-span-1 text-center flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{format(day, "E", { locale: vi })}</span>
                    <span className={`text-base font-black px-2.5 py-0.5 rounded-full mt-0.5 ${
                      isSameDay(day, new Date()) ? "bg-[#A172FD] text-white" : "text-gray-700"
                    }`}>{format(day, "d")}</span>
                  </div>
                )) : (
                  <div className="col-span-7 text-center flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{format(currentDate, "EEEE", { locale: vi })}</span>
                    <span className="text-base font-black px-2.5 py-0.5 bg-[#A172FD] text-white rounded-full mt-0.5">{format(currentDate, "d")}</span>
                  </div>
                )}
              </div>

              {/* Hour Grid and Columns */}
              <div className="flex-1 overflow-y-auto max-h-[600px] relative scrollbar-thin">
                <div className="grid grid-cols-8 relative">
                  
                  {/* Hour labels list */}
                  <div className="col-span-1 border-r border-gray-50 flex flex-col select-none">
                    {Array.from({ length: 24 }).map((_, hour) => {
                      if (hiddenHours.includes(hour)) return null;
                      return (
                        <div 
                          key={hour} 
                          onClick={(e) => {
                            e.preventDefault();
                            setHourMenu({ hour, x: e.clientX, y: e.clientY });
                          }}
                          className="h-[50px] border-b border-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors"
                          title="Nhấn để ẩn hàng"
                        >
                          {`${String(hour).padStart(2, "0")}:00`}
                        </div>
                      );
                    })}
                  </div>

                  {/* Day Columns */}
                  {view === "week" ? (
                    weekDays.map((day, i) => {
                      const isToday = isSameDay(day, new Date());
                      // Filter out floating tasks so they don't render inside column, except completed ones
                      const dayItems = filteredItems.filter(item => isSameDay(new Date(item.startAt), day) && (!item.isTask || !taskPositions[item.id] || item.completed));

                      const columnHeight = (24 - hiddenHours.length) * 50;

                      return (
                        <div 
                          key={i} 
                          style={{ height: `${columnHeight}px` }}
                          className={`col-span-1 relative border-r border-gray-50 ${isToday ? "bg-purple-50/5" : ""}`}
                        >
                          {/* 24 Cell rows */}
                          {Array.from({ length: 24 }).map((_, hour) => {
                            if (hiddenHours.includes(hour)) return null;
                            let isSelected = false;
                            if (isDraggingGrid && dragStart && dragCurrent && isSameDay(dragStart.date, day)) {
                              const minH = Math.min(dragStart.hour, dragCurrent.hour);
                              const maxH = Math.max(dragStart.hour, dragCurrent.hour);
                              isSelected = hour >= minH && hour <= maxH;
                            }
                            const isSelectedSlot = selectedSlot && isSameDay(selectedSlot.date, day) && selectedSlot.hour === hour;

                            return (
                              <div
                                key={hour}
                                onMouseDown={() => handleGridMouseDown(day, hour)}
                                onMouseEnter={() => handleGridMouseEnter(day, hour)}
                                onMouseUp={handleGridMouseUp}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDropOnGrid(e, day, hour)}
                                className={`h-[50px] border-b border-gray-50 transition-colors hour-cell ${
                                  isSelected ? "bg-purple-100/40" : 
                                  isSelectedSlot ? "ring-2 ring-inset ring-[#A172FD]/40 bg-purple-50/10" : "hover:bg-purple-50/10"
                                }`}
                              />
                            );
                          })}

                          {/* Absolute positioned items */}
                          {(() => {
                            const layouts = getEventLayoutStyles(dayItems, day, hiddenHours);
                            return dayItems.map(item => {
                              const pos = layouts[item.id] || { left: "0%", width: "98%", top: 0, height: 50, visible: true };
                              if (!pos.visible) return null;
                              
                              if (item.isTask) {
                                const status = getTaskStatus(item.dueAt || "", item.completed || false);
                                return (
                                  <motion.div 
                                    key={item.id}
                                    drag={!item.completed}
                                    dragMomentum={false}
                                    dragElastic={0}
                                    onDragStart={() => {
                                      draggedTaskIdRef.current = item.id;
                                    }}
                                    onDragEnd={(e, info) => {
                                      handleInlineTaskDragEnd(e, info, item, '.calendar-container');
                                      setTimeout(() => {
                                        draggedTaskIdRef.current = null;
                                      }, 50);
                                    }}
                                    onTap={() => {
                                      if (draggedTaskIdRef.current === item.id) return;
                                      openEditPopup(item);
                                    }}
                                    style={{ 
                                      top: pos.top, 
                                      height: pos.height,
                                      left: pos.left,
                                      width: pos.width,
                                      x: 0,
                                      y: 0,
                                      backgroundColor: getTaskBgColor(item),
                                      zIndex: 30,
                                      opacity: item.completed ? 0.5 : 1
                                    }}
                                    className={`absolute p-1.5 sm:p-2 rounded-xl shadow-md border border-yellow-200/25 flex flex-col justify-between overflow-hidden transform hover:scale-[1.02] hover:z-40 transition-transform select-none task-card-ref group/task ${
                                      item.completed ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
                                    }`}
                                    title={`${item.title} (${format(new Date(item.startAt), "HH:mm")})${item.description ? ' - ' + item.description : ''}`}
                                  >
                                    {(() => {
                                      const contrastColor = getContrastTextColorForEvent(getTaskBgColor(item) || "#fdfd96");
                                      return (
                                        <>
                                          <div className="flex-1 min-h-0 overflow-hidden select-none text-left flex flex-col justify-start">
                                            <p className="font-bold text-[8px] sm:text-[8.5px] leading-[1.15] break-words line-clamp-2" style={{ color: contrastColor }}>
                                              📌 {item.title}
                                            </p>
                                            {item.description && pos.height > 65 && (
                                              <p className="text-[7px] sm:text-[7.5px] opacity-80 font-medium whitespace-pre-wrap break-words leading-tight mt-0.5 line-clamp-1" style={{ color: contrastColor }}>
                                                {item.description}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex items-center justify-between mt-0.5 shrink-0 pt-0.5 border-t border-black/5">
                                            <span className="text-[7px] sm:text-[7.5px] font-semibold flex items-center gap-0.5 truncate max-w-[calc(100%-10px)]" style={{ color: contrastColor, opacity: 0.85 }}>
                                              <Clock className="h-2 w-2 shrink-0" />
                                              <span className="truncate">{format(new Date(item.startAt), "HH:mm")}</span>
                                            </span>
                                            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${getStatusDotColor(status)}`} />
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </motion.div>
                                );
                              } else {
                                return (
                                  <div 
                                    key={item.id}
                                    onClick={(e) => { e.stopPropagation(); openEditPopup(item); }}
                                    title={`${item.title} (${format(new Date(item.startAt), "HH:mm")} - ${format(new Date(item.endAt), "HH:mm")})${item.description ? ' - ' + item.description : ''}`}
                                    style={{ 
                                      top: pos.top, 
                                      height: pos.height,
                                      left: pos.left,
                                      width: pos.width,
                                      zIndex: 20,
                                      ...getEventStyle(item)
                                    }}
                                    className="absolute font-bold p-1.5 sm:p-2 rounded-xl cursor-pointer hover:brightness-95 hover:z-40 flex flex-col text-[8.5px] sm:text-[9px] justify-between shadow-sm overflow-hidden select-none transition-all"
                                  >
                                    <div className="space-y-0.5 flex-1 min-h-0 overflow-hidden">
                                      <p className="leading-snug break-words line-clamp-2">{item.title}</p>
                                      {item.description && pos.height > 65 && (
                                        <p className="text-[7.5px] opacity-90 font-medium whitespace-pre-wrap break-words leading-tight mt-0.5 line-clamp-1">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                    <p className="text-[6.5px] sm:text-[7px] opacity-75 font-normal mt-0.5 self-start shrink-0 truncate max-w-full">
                                      {format(new Date(item.startAt), "HH:mm")} - {format(new Date(item.endAt), "HH:mm")}
                                    </p>
                                  </div>
                                );
                              }
                            });
                          })()}
                        </div>
                      );
                    })
                  ) : (
                    // Day view
                    <div 
                      style={{ height: `${(24 - hiddenHours.length) * 50}px` }}
                      className="col-span-7 relative day-cell"
                    >
                      {/* 24 Cell rows */}
                      {Array.from({ length: 24 }).map((_, hour) => {
                        if (hiddenHours.includes(hour)) return null;
                        let isSelected = false;
                        if (isDraggingGrid && dragStart && dragCurrent && isSameDay(dragStart.date, currentDate)) {
                          const minH = Math.min(dragStart.hour, dragCurrent.hour);
                          const maxH = Math.max(dragStart.hour, dragCurrent.hour);
                          isSelected = hour >= minH && hour <= maxH;
                        }
                        const isSelectedSlot = selectedSlot && isSameDay(selectedSlot.date, currentDate) && selectedSlot.hour === hour;

                        return (
                          <div
                            key={hour}
                            onMouseDown={() => handleGridMouseDown(currentDate, hour)}
                            onMouseEnter={() => handleGridMouseEnter(currentDate, hour)}
                            onMouseUp={handleGridMouseUp}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropOnGrid(e, currentDate, hour)}
                            className={`h-[50px] border-b border-gray-50 transition-colors ${
                              isSelected ? "bg-purple-100/40" : 
                              isSelectedSlot ? "ring-2 ring-inset ring-[#A172FD]/40 bg-purple-50/10" : "hover:bg-purple-50/10"
                            }`}
                          />
                        );
                      })}
                      {/* Absolute positioned items for Day view */}
                      {(() => {
                        const dayItems = filteredItems.filter(item => isSameDay(new Date(item.startAt), currentDate) && (!item.isTask || !taskPositions[item.id] || item.completed));
                        const layouts = getEventLayoutStyles(dayItems, currentDate, hiddenHours);
                        return dayItems.map(item => {
                          const pos = layouts[item.id] || { left: "0%", width: "98%", top: 0, height: 50, visible: true };
                          if (!pos.visible) return null;
                          
                          if (item.isTask) {
                            const status = getTaskStatus(item.dueAt || "", item.completed || false);
                            return (
                              <motion.div 
                                key={item.id}
                                drag={!item.completed}
                                dragMomentum={false}
                                dragElastic={0}
                                onDragStart={() => {
                                  draggedTaskIdRef.current = item.id;
                                }}
                                onDragEnd={(e, info) => {
                                  handleInlineTaskDragEnd(e, info, item, '.calendar-container');
                                  setTimeout(() => {
                                    draggedTaskIdRef.current = null;
                                  }, 50);
                                }}
                                onTap={() => {
                                  if (draggedTaskIdRef.current === item.id) return;
                                  openEditPopup(item);
                                }}
                                style={{ 
                                  top: pos.top, 
                                  height: pos.height,
                                  left: pos.left,
                                  width: pos.width,
                                  x: 0,
                                  y: 0,
                                  backgroundColor: getTaskBgColor(item),
                                  zIndex: 30,
                                  opacity: item.completed ? 0.5 : 1
                                }}
                                className={`absolute p-2.5 sm:p-3 rounded-2xl shadow-md border border-yellow-200/25 flex flex-col justify-between overflow-hidden transform hover:scale-[1.01] hover:z-40 transition-transform select-none task-card-ref group/task ${
                                  item.completed ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
                                }`}
                                title={`${item.title} (${format(new Date(item.startAt), "HH:mm")})${item.description ? ' - ' + item.description : ''}`}
                              >
                                {(() => {
                                  const contrastColor = getContrastTextColorForEvent(getTaskBgColor(item) || "#fdfd96");
                                  return (
                                    <>
                                      <div className="flex-1 min-h-0 overflow-hidden select-none text-left flex flex-col justify-start">
                                        <p className="font-bold text-xs leading-snug break-words line-clamp-2" style={{ color: contrastColor }}>
                                          📌 {item.title}
                                        </p>
                                        {item.description && pos.height > 65 && (
                                          <p className="text-[10px] opacity-80 font-medium whitespace-pre-wrap break-words leading-tight mt-1 line-clamp-2" style={{ color: contrastColor }}>
                                            {item.description}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between mt-1.5 shrink-0 pt-1 border-t border-black/5">
                                        <span className="text-[10px] font-semibold flex items-center gap-1 truncate max-w-[calc(100%-16px)]" style={{ color: contrastColor, opacity: 0.85 }}>
                                          <Clock className="h-3 w-3 shrink-0" />
                                          <span className="truncate">{format(new Date(item.startAt), "HH:mm")}</span>
                                        </span>
                                        <div className={`h-2 w-2 rounded-full shrink-0 ${getStatusDotColor(status)}`} />
                                      </div>
                                    </>
                                  );
                                })()}
                              </motion.div>
                            );
                          } else {
                            return (
                              <div 
                                key={item.id}
                                onClick={(e) => { e.stopPropagation(); openEditPopup(item); }}
                                title={`${item.title} (${format(new Date(item.startAt), "HH:mm")} - ${format(new Date(item.endAt), "HH:mm")})${item.description ? ' - ' + item.description : ''}`}
                                style={{ 
                                  top: pos.top, 
                                  height: pos.height,
                                  left: pos.left,
                                  width: pos.width,
                                  zIndex: 20,
                                  ...getEventStyle(item)
                                }}
                                className="absolute font-bold p-2.5 sm:p-3 rounded-2xl cursor-pointer hover:brightness-95 hover:z-40 flex flex-col text-xs justify-between shadow-sm overflow-hidden select-none transition-all"
                              >
                                <div className="space-y-1 flex-1 min-h-0 overflow-hidden">
                                  <p className="leading-snug break-words line-clamp-2">{item.title}</p>
                                  {item.description && pos.height > 65 && (
                                    <p className="text-[10px] opacity-90 font-medium whitespace-pre-wrap break-words leading-tight mt-0.5 line-clamp-2">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <p className="text-[9px] opacity-75 font-normal mt-1 self-start shrink-0 truncate max-w-full">
                                  {format(new Date(item.startAt), "HH:mm")} - {format(new Date(item.endAt), "HH:mm")}
                                </p>
                              </div>
                            );
                          }
                        });
                      })()}
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FLOATING WHITEBOARD CANVAS TASKS */}
      {items
        .filter(item => item.isTask && !item.completed && taskPositions[item.id])
        .map(task => {
          const isEditingThisTask = showPopup && editingItem?.id === task.id;
          return (
            <motion.div
              key={task.id}
              drag
              dragMomentum={false}
              dragElastic={0}
              onDragStart={() => {
                draggedTaskIdRef.current = task.id;
              }}
              onDragEnd={(e, info) => {
                handleTaskDragEnd(task.id, info);
                setTimeout(() => {
                  draggedTaskIdRef.current = null;
                }, 50);
              }}
              onTap={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                if (draggedTaskIdRef.current === task.id) return;
                openEditPopup(task);
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                x: taskPositions[task.id]?.x ?? 200,
                y: taskPositions[task.id]?.y ?? 100,
                backgroundColor: getTaskBgColor(task),
                zIndex: 100,
                display: isEditingThisTask ? "none" : "flex",
              }}
              className="h-44 w-40 p-4 shadow-xl rounded-br-[40px] border border-black/5 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none"
            >
              {/* Checklist completion button */}
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  await fetch("/api/tasks", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: task.id, completed: true, mode: "one" })
                  });
                  // Clean up floating position so the task returns cleanly to the calendar grid
                  const updated = { ...taskPositions };
                  delete updated[task.id];
                  if (task.id.includes("_rec_")) {
                    delete updated[task.id.split("_rec_")[0]];
                  }
                  setTaskPositions(updated);
                  localStorage.setItem("calendar-task-positions", JSON.stringify(updated));
                  showToast(`Đã hoàn thành: "${task.title}"!`);
                  loadData();
                }}
                className="absolute top-2 left-2 p-1 rounded-xl bg-black/5 hover:bg-green-500 hover:text-white text-gray-700 transition-colors z-10"
                title="Hoàn thành"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              {/* Unpin button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const updated = { ...taskPositions };
                  delete updated[task.id];
                  setTaskPositions(updated);
                  localStorage.setItem("calendar-task-positions", JSON.stringify(updated));
                  showToast("Đã gỡ ghi chú khỏi màn hình.");
                }}
                className="absolute top-2 right-2 p-1 rounded-xl bg-black/5 hover:bg-black/10 text-gray-700 hover:text-red-500 transition-colors z-10"
                title="Gỡ khỏi màn hình"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="flex-1 flex flex-col justify-between mt-5 min-h-0 select-none">
                {(() => {
                  const contrastColor = getContrastTextColorForEvent(getTaskBgColor(task) || "#fdfd96");
                  return (
                    <>
                      <p className="font-black text-xs leading-snug break-words pr-4 shrink-0" style={{ color: contrastColor }}>
                        📌 {task.title}
                      </p>
                      <div className="flex-1 overflow-y-auto note-scrollbar pr-1 mt-1">
                        {task.description && (
                          <p className="text-[10px] whitespace-pre-wrap break-words leading-tight" style={{ color: contrastColor, opacity: 0.9 }}>
                            {task.description}
                          </p>
                        )}
                      </div>
                      <p className="text-[8px] font-bold mt-2 shrink-0 self-start" style={{ color: contrastColor, opacity: 0.75 }}>
                        {task.dueAt ? new Date(task.dueAt).toLocaleString("vi-VN", { dateStyle: 'short', timeStyle: 'short' }) : "Không thời hạn"}
                      </p>
                    </>
                  );
                })()}
              </div>

              {/* Peeling corner */}
              <div className="absolute bottom-0 right-0 h-10 w-10 rounded-tl-xl bg-black/5" />
            </motion.div>
          );
        })}

      {/* MODAL: EVENT & TASK FORM */}
      <EventFormModal
        showPopup={showPopup}
        setShowPopup={setShowPopup}
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        clearForm={clearForm}
        handleSave={handleSave}
        itemType={itemType}
        setItemType={setItemType}
        title={title}
        setTitle={setTitle}
        startAtStr={startAtStr}
        setStartAtStr={setStartAtStr}
        endAtStr={endAtStr}
        setEndAtStr={setEndAtStr}
        selectedTagId={selectedTagId}
        setSelectedTagId={setSelectedTagId}
        tags={tags}
        recurrence={recurrence}
        setRecurrence={setRecurrence}
        recurrenceEndStr={recurrenceEndStr}
        setRecurrenceEndStr={setRecurrenceEndStr}
        notification={notification}
        setNotification={setNotification}
        completed={completed}
        setCompleted={setCompleted}
        noteColor={noteColor}
        setNoteColor={setNoteColor}
        description={description}
        setDescription={setDescription}
        handleDeleteClick={handleDeleteClick}
        setCopiedItem={setCopiedItem}
        showToast={showToast}
        isSubmitting={isSubmitting}
      />

      {/* MODALS: TAG CREATION & EDITING */}
      <TagModals
        showTagModal={showTagModal}
        setShowTagModal={setShowTagModal}
        newTagName={newTagName}
        setNewTagName={setNewTagName}
        newTagColor={newTagColor}
        setNewTagColor={setNewTagColor}
        handleCreateTag={handleCreateTag}
        showEditTagModal={showEditTagModal}
        setShowEditTagModal={setShowEditTagModal}
        editingTag={editingTag}
        setEditingTag={setEditingTag}
        handleUpdateTag={handleUpdateTag}
      />

      {/* MODALS: CONFIRMATIONS & DELETIONS */}
      <ConfirmationModals
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        executeDelete={executeDelete}
        saveConfirm={saveConfirm}
        setSaveConfirm={setSaveConfirm}
        executeSave={executeSave}
      />

      {/* HOUR ROW CONTEXT MENU FOR HIDING */}
      {hourMenu && (
        <>
          <div className="fixed inset-0 z-[199]" onClick={() => setHourMenu(null)} />
          <div 
            className="fixed z-[200] bg-white border border-gray-100 rounded-2xl shadow-xl p-2 w-40"
            style={{ left: hourMenu.x, top: hourMenu.y }}
          >
            <button
              onClick={() => {
                setHiddenHours(prev => [...prev, hourMenu.hour]);
                setHourMenu(null);
                showToast(`Đã ẩn hàng lúc ${String(hourMenu.hour).padStart(2, "0")}:00.`);
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5"
            >
              Ẩn hàng này
            </button>
            {hiddenHours.length > 0 && (
              <button
                onClick={() => {
                  setHiddenHours([]);
                  setHourMenu(null);
                  showToast("Đã hiện lại tất cả các hàng.");
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-purple-600 hover:bg-purple-50 rounded-xl transition-colors flex items-center gap-1.5 border-t border-gray-50 mt-1 pt-2"
              >
                Hiện tất cả hàng
              </button>
            )}
          </div>
        </>
      )}

      <OnboardingTour pageKey="calendar" steps={calendarSteps} />
    </div>
  );
}
