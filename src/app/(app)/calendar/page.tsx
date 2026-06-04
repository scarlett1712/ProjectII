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
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Plus, 
  Trash2, 
  Clock, 
  Tag as TagIcon, 
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
import { OnboardingTour, TourStep } from "@/components/OnboardingTour";

const calendarSteps: TourStep[] = [
  {
    selector: "#tour-cal-nav",
    title: "Bộ điều hướng thời gian",
    content: "Dễ dàng chuyển đổi giữa các ngày, tuần hoặc tháng để quản lý lịch trình của bạn.",
  },
  {
    selector: "#tour-cal-task-pad",
    title: "Tập giấy Note kéo thả",
    content: "Xé một tờ giấy công việc bằng cách nhấn giữ và kéo thả trực tiếp vào khung giờ trên lịch biểu bên phải để lên lịch thực hiện.",
  },
  {
    selector: "#tour-cal-tags",
    title: "Quản lý nhãn phân loại",
    content: "Thêm hoặc lọc lịch trình theo nhãn màu để giao diện luôn trực quan và gọn gàng.",
  },
  {
    selector: "#tour-cal-views",
    title: "Chế độ xem lịch trình",
    content: "Chuyển đổi linh hoạt giữa xem theo Tháng, Tuần hoặc Ngày phù hợp với nhu cầu theo dõi công việc của bạn.",
  }
];

type Tag = { id: string; name: string; color: string; isSystem: boolean };
type CalendarItem = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  tagId?: string | null;
  color?: string | null;
  notification: boolean;
  noteColor?: string | null;
  recurrence?: string | null;
  recurrenceEnd?: string | null;
  isRecurringInstance?: boolean;
  originalId?: string;
  completed?: boolean;
  isTask?: boolean; // UI flag to differentiate
  dueAt?: string | null;
};

// Helper function to calculate side-by-side positioning for overlapping events
const getEventLayoutStyles = (dayItems: any[], day: Date, hiddenHours: number[] = []) => {
  // 1. Map each item to its start and end hour
  const itemsWithHours = dayItems.map(item => {
    const start = new Date(item.startAt);
    const end = new Date(item.endAt || item.startAt);
    let startHour = 0;
    let endHour = 24;
    
    const isSameDayLocal = (d1: Date, d2: Date) => {
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    };

    if (isSameDayLocal(start, day)) {
      startHour = start.getHours() + start.getMinutes() / 60;
    }
    if (isSameDayLocal(end, day)) {
      endHour = end.getHours() + end.getMinutes() / 60;
    } else if (item.isTask) {
      endHour = startHour + 1.0;
    }
    
    if (endHour <= startHour) {
      endHour = startHour + 1.0;
    }
    
    // calculate top and height taking hiddenHours into account
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
    height = Math.max(15, height); // ensure minimum height
    const visible = !hiddenHours.includes(startHourFloor);

    return {
      item,
      startHour,
      endHour,
      top,
      height,
      visible
    };
  });

  // 2. Sort by startHour, then by duration descending
  itemsWithHours.sort((a, b) => {
    if (a.startHour !== b.startHour) return a.startHour - b.startHour;
    return (b.endHour - b.startHour) - (a.endHour - a.startHour);
  });

  // 3. Find overlapping groups (clusters)
  const clusters: (typeof itemsWithHours[number])[][] = [];
  itemsWithHours.forEach(item => {
    let added = false;
    for (const cluster of clusters) {
      const overlaps = cluster.some(cItem => 
        item.startHour < cItem.endHour && item.endHour > cItem.startHour
      );
      if (overlaps) {
        cluster.push(item);
        added = true;
        break;
      }
    }
    if (!added) {
      clusters.push([item]);
    }
  });

  // 4. For each cluster, assign columns
  const layoutStyles: Record<string, { left: string; width: string; top: number; height: number; visible: boolean }> = {};
  clusters.forEach(cluster => {
    const columns: (typeof itemsWithHours[number])[][] = [];
    cluster.forEach(item => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const overlaps = col.some(cItem => 
          item.startHour < cItem.endHour && item.endHour > cItem.startHour
        );
        if (!overlaps) {
          col.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([item]);
      }
    });

    const colCount = columns.length;
    columns.forEach((col, colIndex) => {
      col.forEach(item => {
        const widthPercent = 100 / colCount;
        const leftPercent = colIndex * widthPercent;
        layoutStyles[item.item.id] = {
          left: `${leftPercent}%`,
          width: `${widthPercent - 2}%`,
          top: item.top,
          height: item.height,
          visible: item.visible
        };
      });
    });
  });

  return layoutStyles;
};

// Helper to ensure readable text color for tags/categories by darkening light colors
const getContrastTextColor = (hexColor: string) => {
  if (!hexColor) return "#A172FD";
  let cleanHex = hexColor.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map(c => c + c).join("");
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness > 150) {
    const factor = 0.55;
    const dr = Math.max(0, Math.min(255, Math.floor(r * factor)));
    const dg = Math.max(0, Math.min(255, Math.floor(g * factor)));
    const db = Math.max(0, Math.min(255, Math.floor(b * factor)));
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  }
  return hexColor;
};

// Helper to ensure readable text color for event cards on pale backgrounds
const getContrastTextColorForEvent = (hexColor: string) => {
  if (!hexColor) return "#1F2937";
  let cleanHex = hexColor.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map(c => c + c).join("");
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const factor = brightness > 150 ? 0.35 : 0.6;
  const dr = Math.max(0, Math.min(255, Math.floor(r * factor)));
  const dg = Math.max(0, Math.min(255, Math.floor(g * factor)));
  const db = Math.max(0, Math.min(255, Math.floor(b * factor)));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
};

// Helper to get matching tag styling based on background color brightness
const getTagStyles = (hexColor: string) => {
  if (!hexColor) return { backgroundColor: "#A172FD15", color: "#A172FD", border: "1px solid rgba(161, 114, 253, 0.3)" };
  let cleanHex = hexColor.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map(c => c + c).join("");
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  if (brightness > 180) {
    const factor = 0.35;
    const dr = Math.max(0, Math.min(255, Math.floor(r * factor)));
    const dg = Math.max(0, Math.min(255, Math.floor(g * factor)));
    const db = Math.max(0, Math.min(255, Math.floor(b * factor)));
    const textColor = `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
    return {
      backgroundColor: hexColor,
      color: textColor,
      border: `1px solid ${textColor}30`
    };
  } else if (brightness > 130) {
    const factor = 0.45;
    const dr = Math.max(0, Math.min(255, Math.floor(r * factor)));
    const dg = Math.max(0, Math.min(255, Math.floor(g * factor)));
    const db = Math.max(0, Math.min(255, Math.floor(b * factor)));
    const textColor = `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
    return {
      backgroundColor: hexColor,
      color: textColor,
      border: `1px solid ${textColor}30`
    };
  } else {
    return {
      backgroundColor: hexColor,
      color: "#FFFFFF",
      border: "1px solid rgba(255, 255, 255, 0.15)"
    };
  }
};

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
  const [selectedTagId, setSelectedTagId] = useState("system-event");
  const [notification, setNotification] = useState(false);
  const [noteColor, setNoteColor] = useState("#fdfd96"); // Yellow default
  const [recurrence, setRecurrence] = useState("NONE");
  const [recurrenceEndStr, setRecurrenceEndStr] = useState("");
  const [completed, setCompleted] = useState(false);

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

  const presetColors = [
    "#fdfd96", // Pastel Yellow
    "#FCA5A5", // Pastel Red
    "#93C5FD", // Pastel Blue
    "#A7F3D0", // Pastel Green
    "#C084FC", // Pastel Purple
    "#FDA4AF", // Pastel Pink
    "#F97316", // Warm Orange
    "#06B6D4"  // Turquoise
  ];

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
      // Load tags
      const tagRes = await fetch("/api/tags");
      const tagData = await tagRes.json();
      
      // Merge system tag overrides
      let overrides: Record<string, { name: string; color: string }> = {};
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("calendar-tag-overrides");
        if (stored) {
          try { overrides = JSON.parse(stored); } catch {}
        }
      }
      
      const mergedTags = tagData.map((t: Tag) => {
        if (t.id.startsWith("system-") && overrides[t.id]) {
          return { ...t, ...overrides[t.id] };
        }
        return t;
      });
      setTags(mergedTags);
      
      // Auto-select all tags initially if none selected
      if (selectedTags.length === 0) {
        setSelectedTags(mergedTags.map((t: Tag) => t.id));
      }

      // Load calendar events
      const startRange = startOfMonth(subMonths(currentDate, 2)).toISOString();
      const endRange = endOfMonth(addMonths(currentDate, 4)).toISOString();
      
      const calRes = await fetch(`/api/calendar?start=${startRange}&end=${endRange}`);
      const calData = await calRes.json();
      
      // Load tasks
      const taskRes = await fetch("/api/tasks");
      const taskData = await taskRes.json();

      // Transform tasks into calendar-friendly structures
      const formattedTasks = taskData.map((task: any) => ({
        ...task,
        isTask: true,
        startAt: task.dueAt || task.createdAt,
        endAt: task.dueAt || task.createdAt,
        tagId: task.tagId || "system-task"
      }));

      // Combine
      setItems([...calData, ...formattedTasks]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      notification,
      noteColor,
      color: noteColor, // Ensure color is saved in DB
      tagId: selectedTagId
    };

    if (itemType === "event") {
      payload.startAt = new Date(startAtStr).toISOString();
      payload.endAt = new Date(endAtStr).toISOString();
      payload.allDay = allDay;
      payload.recurrence = recurrence;
      payload.recurrenceEnd = recurrenceEndStr ? new Date(recurrenceEndStr).toISOString() : null;
    } else {
      payload.dueAt = startAtStr ? new Date(startAtStr).toISOString() : null; // Optional deadline!
      payload.completed = completed;
    }

    try {
      let url = itemType === "event" ? "/api/calendar" : "/api/tasks";
      let method = "POST";
      
      if (editingItem) {
        payload.id = editingItem.isRecurringInstance ? editingItem.originalId : editingItem.id;
        method = "PATCH";
        if (editingItem.isTask) {
          url = "/api/tasks";
        } else {
          url = "/api/calendar";
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
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePasteEvent = async (start: Date, end: Date | null) => {
    if (!copiedItem) return;

    let startAt = start.toISOString();
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
        loadData();
      }
    } catch (e) {
      console.error(e);
      showToast("Lỗi khi dán lịch trình.");
    }
  };

  const executeDelete = async (id: string, isTask: boolean, mode: "one" | "all") => {
    try {
      const url = isTask 
        ? `/api/tasks?id=${id}` 
        : `/api/calendar?id=${id}&mode=${mode}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        setShowPopup(false);
        setEditingItem(null);
        showToast("Đã xóa thành công!");
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
    const isRecurring = !!(item && !isTask && item.recurrence && item.recurrence !== "NONE");
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
    setSelectedTagId("system-event");
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
    const defaultTagId = isTaskVal ? "system-task" : "system-event";
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
    setSelectedTagId(item.tagId || (item.isTask ? "system-task" : "system-event"));
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
    const tagId = item.tagId || (item.isTask ? "system-task" : "system-event");
    return selectedTags.includes(tagId);
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
                // Filter out floating tasks so they don't render in cell
                const dayItems = filteredItems.filter(item => isSameDay(parseISO(item.startAt), day) && (!item.isTask || !taskPositions[item.id]));
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
                              drag
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
                                backgroundColor: getTaskBgColor(item),
                                x: 0,
                                y: 0
                              }}
                              className="text-[10px] p-1.5 rounded-lg shadow-sm border border-yellow-200/25 flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing task-card-ref select-none"
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
                                    drag
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
                                    className="absolute p-2 rounded-xl shadow-md border border-yellow-200/25 flex flex-col justify-between cursor-grab active:cursor-grabbing transform hover:scale-[1.02] transition-transform select-none task-card-ref group/task"
                                  >
                                    {(() => {
                                      const contrastColor = getContrastTextColorForEvent(getTaskBgColor(item) || "#fdfd96");
                                      return (
                                        <>
                                          <div className="flex-1 flex flex-col min-h-0 select-none text-left">
                                            <p className="font-bold text-[9px] leading-tight break-words shrink-0" style={{ color: contrastColor }}>
                                              📌 {item.title}
                                            </p>
                                            <div className="flex-1 overflow-y-auto note-scrollbar pr-0.5 mt-0.5">
                                              {item.description && (
                                                <p className="text-[7.5px] opacity-90 font-medium whitespace-pre-wrap break-words leading-tight" style={{ color: contrastColor }}>
                                                  {item.description}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between mt-1 shrink-0">
                                            <span className="text-[7px] font-semibold flex items-center gap-0.5" style={{ color: contrastColor, opacity: 0.75 }}>
                                              <Clock className="h-2 w-2" />
                                              {format(new Date(item.startAt), "HH:mm")}
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
                                    style={{ 
                                      top: pos.top, 
                                      height: pos.height,
                                      left: pos.left,
                                      width: pos.width,
                                      zIndex: 20,
                                      ...getEventStyle(item)
                                    }}
                                    className="absolute font-bold p-2 rounded-xl cursor-pointer hover:brightness-95 flex flex-col text-[9px] justify-between shadow-sm overflow-y-auto scrollbar-none select-none transition-all"
                                  >
                                    <div className="space-y-0.5 flex-1 min-h-0">
                                      <p className="leading-snug break-words">{item.title}</p>
                                      {item.description && (
                                        <p className="text-[7.5px] opacity-90 font-medium whitespace-pre-wrap break-words leading-tight mt-0.5">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                    <p className="text-[6.5px] opacity-75 font-normal mt-1 self-start shrink-0">
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
                                drag
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
                                className="absolute p-3 rounded-2xl shadow-md border border-yellow-200/25 flex flex-col justify-between cursor-grab active:cursor-grabbing transform hover:scale-[1.01] transition-transform select-none task-card-ref group/task"
                              >
                                {(() => {
                                  const contrastColor = getContrastTextColorForEvent(getTaskBgColor(item) || "#fdfd96");
                                  return (
                                    <>
                                      <div className="flex-1 flex flex-col min-h-0 select-none text-left">
                                        <p className="font-bold text-xs leading-tight break-words shrink-0" style={{ color: contrastColor }}>
                                          📌 {item.title}
                                        </p>
                                        <div className="flex-1 overflow-y-auto note-scrollbar pr-1 mt-1">
                                          {item.description && (
                                            <p className="text-[10px] opacity-90 font-medium whitespace-pre-wrap break-words leading-tight" style={{ color: contrastColor }}>
                                              {item.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between mt-2 shrink-0">
                                        <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: contrastColor, opacity: 0.75 }}>
                                          <Clock className="h-3 w-3" />
                                          {format(new Date(item.startAt), "HH:mm")}
                                        </span>
                                        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${getStatusDotColor(status)}`} />
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
                                style={{ 
                                  top: pos.top, 
                                  height: pos.height,
                                  left: pos.left,
                                  width: pos.width,
                                  zIndex: 20,
                                  ...getEventStyle(item)
                                }}
                                className="absolute font-bold p-3 rounded-2xl cursor-pointer hover:brightness-95 flex flex-col text-xs justify-between shadow-sm overflow-y-auto scrollbar-none select-none transition-all"
                              >
                                <div className="space-y-1 flex-1 min-h-0">
                                  <p className="leading-snug break-words">{item.title}</p>
                                  {item.description && (
                                    <p className="text-[10px] opacity-90 font-medium whitespace-pre-wrap break-words leading-tight mt-0.5">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <p className="text-[9px] opacity-75 font-normal mt-1 self-start shrink-0">
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
                    body: JSON.stringify({ id: task.id, completed: true })
                  });
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

      {/* POPUP: EVENT/TASK CREATOR & EDITOR */}
      <AnimatePresence>
        {showPopup && (
          <div 
            onClick={() => { setShowPopup(false); setEditingItem(null); clearForm(); }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 popup-dialog"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-[500px] rounded-[32px] p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto scrollbar-thin"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#A172FD]">
                  {editingItem ? "Chỉnh sửa công việc" : "Tạo công việc/lịch trình"}
                </h3>
                <button 
                  onClick={() => { setShowPopup(false); setEditingItem(null); clearForm(); }} 
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                {/* Event/Task Toggle */}
                {!editingItem && (
                  <div className="grid grid-cols-2 gap-2 bg-[#F5F3FF] p-1 rounded-xl text-sm font-bold">
                    <button 
                      type="button" 
                      onClick={() => { 
                        setItemType("event"); 
                        setSelectedTagId("system-event"); 
                        setNotification(false);
                      }} 
                      className={`py-2 rounded-lg text-center transition-all ${itemType === "event" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280]"}`}
                    >
                      Lịch cố định
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { 
                        setItemType("task"); 
                        setSelectedTagId("system-task"); 
                        setNotification(startAtStr !== "");
                      }} 
                      className={`py-2 rounded-lg text-center transition-all ${itemType === "task" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280]"}`}
                    >
                      Nhiệm vụ (Task)
                    </button>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tiêu đề</label>
                  <input 
                    required 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="Nhập tiêu đề..." 
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]" 
                  />
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      {itemType === "event" ? "Bắt đầu" : "Thời hạn (Không bắt buộc)"}
                    </label>
                    <input 
                      required={itemType === "event"} // Optional deadline for tasks!
                      type="datetime-local" 
                      value={startAtStr} 
                      onChange={e => {
                        const val = e.target.value;
                        setStartAtStr(val);
                        if (itemType === "task") {
                          setNotification(val !== "");
                          if (val !== "" && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
                            Notification.requestPermission();
                          }
                        }
                      }} 
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]" 
                    />
                  </div>
                  {itemType === "event" && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Kết thúc</label>
                      <input 
                        required 
                        type="datetime-local" 
                        value={endAtStr} 
                        onChange={e => setEndAtStr(e.target.value)} 
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]" 
                      />
                    </div>
                  )}
                </div>

                {/* Classification Tag */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 tracking-wider mb-1.5 uppercase">Phân loại nhãn</label>
                  <div className="relative">
                    {/* Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                      className="flex items-center justify-between w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD] text-left"
                    >
                      {(() => {
                        const selectedTag = tags.find((t) => t.id === selectedTagId);
                        if (selectedTag) {
                          const styles = getTagStyles(selectedTag.color);
                          return (
                            <span
                              className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans"
                              style={{
                                backgroundColor: styles.backgroundColor,
                                color: styles.color,
                                border: styles.border,
                              }}
                            >
                              {selectedTag.name} {selectedTag.isSystem ? "(Mặc định)" : "(Custom)"}
                            </span>
                          );
                        }
                        return <span className="text-gray-400">-- Chọn nhãn --</span>;
                      })()}
                      <ChevronDown className="h-4 w-4 text-[#A172FD] shrink-0 ml-2" />
                    </button>

                    {/* Backdrop for click-outside */}
                    {tagDropdownOpen && (
                      <div
                        className="fixed inset-0 z-[240]"
                        onClick={() => setTagDropdownOpen(false)}
                      />
                    )}

                    {/* Dropdown Options List */}
                    {tagDropdownOpen && (
                      <div className="absolute z-[250] mt-1.5 w-full bg-white border border-gray-100 rounded-2xl shadow-xl p-2 max-h-[200px] overflow-y-auto space-y-1">
                        {tags.map((t) => {
                          const styles = getTagStyles(t.color);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedTagId(t.id);
                                setNoteColor(t.color);
                                setTagDropdownOpen(false);
                              }}
                              className="w-full text-left p-2 hover:bg-purple-50/50 rounded-xl transition-colors flex items-center"
                            >
                              <span
                                className="inline-block px-3 py-1 rounded-full text-xs font-bold font-sans"
                                style={{
                                  backgroundColor: styles.backgroundColor,
                                  color: styles.color,
                                  border: styles.border,
                                }}
                              >
                                {t.name} {t.isSystem ? "(Mặc định)" : "(Custom)"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Recurrence Options */}
                {itemType === "event" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Lặp lại</label>
                      <select 
                        value={recurrence} 
                        onChange={e => {
                          const val = e.target.value;
                          setRecurrence(val);
                          if (val !== "NONE" && !recurrenceEndStr) {
                            // Set default to 1 month from now at 23:59
                            const defaultEnd = new Date();
                            defaultEnd.setMonth(defaultEnd.getMonth() + 1);
                            defaultEnd.setHours(23, 59, 0, 0);
                            const offset = defaultEnd.getTimezoneOffset();
                            const local = new Date(defaultEnd.getTime() - offset * 60 * 1000);
                            setRecurrenceEndStr(local.toISOString().slice(0, 16));
                          }
                        }} 
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
                      >
                        <option value="NONE">Không lặp</option>
                        <option value="DAILY">Hàng ngày</option>
                        <option value="WEEKLY">Hàng tuần</option>
                        <option value="MONTHLY">Hàng tháng</option>
                      </select>
                    </div>
                    {recurrence !== "NONE" && (
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Kết thúc lặp</label>
                        <input 
                          type="datetime-local" 
                          value={recurrenceEndStr} 
                          onChange={e => {
                            let val = e.target.value;
                            if (val && val.includes("T")) {
                              const [date, time] = val.split("T");
                              if (time === "00:00") {
                                val = `${date}T23:59`;
                              }
                            }
                            setRecurrenceEndStr(val);
                          }} 
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]" 
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Options: Notification & Note Color */}
                <div className="flex items-center justify-between py-2 border-y border-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thông báo (Windows + Chatbot)</span>
                    <button 
                      type="button"
                      onClick={() => {
                        const nextVal = !notification;
                        setNotification(nextVal);
                        if (nextVal && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
                          Notification.requestPermission();
                        }
                      }}
                      className={`p-2 rounded-xl transition-all ${notification ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"}`}
                      title={notification ? "Bật thông báo" : "Tắt thông báo"}
                    >
                      {notification ? <Bell className="h-5 w-5 animate-bounce" /> : <BellOff className="h-5 w-5" />}
                    </button>
                  </div>
                  
                  {itemType === "task" && editingItem && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">Hoàn thành</span>
                      <input 
                        type="checkbox" 
                        checked={completed} 
                        onChange={e => setCompleted(e.target.checked)} 
                        className="h-5 w-5 accent-[#A172FD] cursor-pointer" 
                      />
                    </div>
                  )}
                </div>

                {/* Pastel Note Color Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Màu sắc giấy note / sự kiện</label>
                  <div className="flex flex-wrap gap-2">
                    {presetColors.map(c => (
                      <button 
                        key={c}
                        type="button"
                        onClick={() => setNoteColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110 flex items-center justify-center ${
                          noteColor === c ? "border-[#A172FD]" : "border-transparent"
                        }`}
                      >
                        {noteColor === c && <Check className="h-4 w-4 text-gray-700" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes/Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Ghi chú</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Thêm mô tả..." 
                    className="w-full h-24 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:border-[#A172FD] resize-none" 
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 pt-3">
                  {editingItem && (
                    <>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteClick(editingItem.id, editingItem.isTask || false)} 
                        className="px-4 py-3.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors font-bold text-sm"
                      >
                        Xóa
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setCopiedItem(editingItem);
                          setShowPopup(false);
                          setEditingItem(null);
                          showToast(`Đã sao chép "${editingItem.title}"! Nhấp vào ô trống trên lịch để dán.`);
                        }} 
                        className="px-4 py-3.5 rounded-xl border border-[#A172FD] text-[#A172FD] hover:bg-[#F5F3FF] transition-colors font-bold text-sm"
                      >
                        Sao chép
                      </button>
                    </>
                  )}
                  <button 
                    type="submit" 
                    className="flex-1 rounded-xl bg-[#A172FD] py-3.5 font-bold text-white hover:bg-[#8b5cf6] transition-colors shadow-md text-sm"
                  >
                    Lưu
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD CUSTOM TAG */}
      <AnimatePresence>
        {showTagModal && (
          <div 
            onClick={() => setShowTagModal(false)}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 popup-dialog"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-[360px] rounded-[28px] p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#A172FD]">Thêm nhãn mới</h3>
                <button onClick={() => setShowTagModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTag} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tên nhãn</label>
                  <input 
                    required 
                    type="text" 
                    value={newTagName} 
                    onChange={e => setNewTagName(e.target.value)} 
                    placeholder="Ví dụ: Việc học, Việc nhà..." 
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Màu sắc nhãn</label>
                  <div className="flex flex-wrap gap-2">
                    {presetColors.map(c => (
                      <button 
                        key={c}
                        type="button"
                        onClick={() => setNewTagColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                          newTagColor === c ? "border-[#A172FD]" : "border-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit" 
                    className="w-full rounded-xl bg-[#A172FD] py-2 text-sm font-bold text-white hover:bg-[#8b5cf6] transition-colors shadow-md"
                  >
                    Lưu nhãn
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT TAG */}
      <AnimatePresence>
        {showEditTagModal && editingTag && (
          <div 
            onClick={() => { setShowEditTagModal(false); setEditingTag(null); }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 popup-dialog"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-[360px] rounded-[28px] p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#A172FD]">Sửa nhãn</h3>
                <button onClick={() => { setShowEditTagModal(false); setEditingTag(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingTag) {
                    handleUpdateTag(editingTag.id, editingTag.name, editingTag.color);
                  }
                }} 
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tên nhãn</label>
                  <input 
                    required 
                    type="text" 
                    value={editingTag.name} 
                    onChange={e => setEditingTag({ ...editingTag, name: e.target.value })} 
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Màu sắc nhãn</label>
                  <div className="flex flex-wrap gap-2">
                    {presetColors.map(c => (
                      <button 
                        key={c}
                        type="button"
                        onClick={() => setEditingTag({ ...editingTag, color: c })}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                          editingTag.color === c ? "border-[#A172FD]" : "border-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit" 
                    className="w-full rounded-xl bg-[#A172FD] py-2 text-sm font-bold text-white hover:bg-[#8b5cf6] transition-colors shadow-md"
                  >
                    Cập nhật
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRM DIALOG */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.show && (
          <div 
            onClick={() => setConfirmDialog(null)}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-[400px] rounded-[32px] p-6 shadow-2xl border border-gray-100 relative"
            >
              <button 
                onClick={() => setConfirmDialog(null)} 
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-4 mt-2">
                <div className="p-3 bg-purple-50 text-[#A172FD] rounded-2xl">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {confirmDialog.title}
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-6 font-semibold">
                {confirmDialog.message}
              </p>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="w-full rounded-xl bg-[#A172FD] py-3 font-bold text-white hover:bg-[#8b5cf6] transition-colors shadow-md text-sm"
              >
                Đồng ý
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {deleteConfirm && deleteConfirm.show && (
          <div 
            onClick={() => setDeleteConfirm(null)}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-[420px] rounded-[32px] p-6 shadow-2xl border border-gray-100 relative"
            >
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-4 mt-2">
                <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  Xác nhận xóa {deleteConfirm.isTask ? "công việc" : "lịch trình"}
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-6 font-semibold">
                {deleteConfirm.isRecurring 
                  ? "Đây là một lịch trình lặp lại. Bạn muốn xóa duy nhất sự kiện này hay toàn bộ chuỗi lặp?"
                  : `Bạn có chắc chắn muốn xóa ${deleteConfirm.isTask ? "công việc" : "lịch trình"} này không?`}
              </p>
              <div className="flex flex-col gap-2">
                {deleteConfirm.isRecurring ? (
                  <>
                    <button 
                      onClick={() => {
                        executeDelete(deleteConfirm.id, deleteConfirm.isTask, "one");
                        setDeleteConfirm(null);
                      }}
                      className="w-full rounded-xl bg-amber-500 py-3 font-bold text-white hover:bg-amber-600 transition-colors shadow-md text-sm"
                    >
                      Xóa duy nhất sự kiện này
                    </button>
                    <button 
                      onClick={() => {
                        executeDelete(deleteConfirm.id, deleteConfirm.isTask, "all");
                        setDeleteConfirm(null);
                      }}
                      className="w-full rounded-xl bg-red-500 py-3 font-bold text-white hover:bg-red-600 transition-colors shadow-md text-sm"
                    >
                      Xóa toàn bộ chuỗi lặp
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      executeDelete(deleteConfirm.id, deleteConfirm.isTask, "all");
                      setDeleteConfirm(null);
                    }}
                    className="w-full rounded-xl bg-red-500 py-3 font-bold text-white hover:bg-red-600 transition-colors shadow-md text-sm"
                  >
                    Xác nhận xóa
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
