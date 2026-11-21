import { useTranslations } from "next-intl";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  setHours,
  setMinutes,
} from "date-fns";
import { Plus } from "lucide-react";
import { Tag, CalendarItem } from "@/features/calendar/presentation/types";
import { DEFAULT_EVENT_LAYOUT } from "@/features/calendar/presentation/calendarUtils";
import { colors } from "@/shared/theme/tokens";
import { contrastTextColor } from "@/features/calendar/presentation/taskNoteColors";
import { useTaskPositions } from "@/features/calendar/presentation/components/useTaskPositions";
import { CalendarTaskCard } from "@/features/calendar/presentation/components/CalendarTaskCard";
import { CalendarEventCard } from "@/features/calendar/presentation/components/CalendarEventCard";
import { MonthGrid } from "@/features/calendar/presentation/components/MonthGrid";
import { TimeGridView } from "./TimeGridView";

interface CalendarGridProps {
  items: CalendarItem[];
  tags: Tag[];
  hiddenTagIds: string[];
  currentDate: Date;
  view: "month" | "week" | "day";
  setView: (view: "month" | "week" | "day") => void;
  taskPositions: ReturnType<typeof useTaskPositions>;
  openEditPopup: (item: CalendarItem) => void;
  openCreatePopup: (start: Date | null, end: Date | null, task?: boolean, position?: { x: number; y: number }) => void;
  handleMonthDayClick: (day: Date) => void;
  selectedSlot: { date: Date; hour: number } | null;
  setSelectedSlot: (slot: { date: Date; hour: number }) => void;
  showToast: (msg: string) => void;
}

export function CalendarGrid({
  items,
  tags,
  hiddenTagIds,
  currentDate,
  view,
  setView,
  taskPositions,
  openEditPopup,
  openCreatePopup,
  handleMonthDayClick,
  selectedSlot,
  setSelectedSlot,
  showToast,
}: CalendarGridProps) {
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const handleDropOnGrid = (e: React.DragEvent, date: Date, hour: number = 12) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (data === "new-task") {
      const start = setMinutes(setHours(date, hour), 0);
      const end = setMinutes(setHours(date, hour + 1), 0);

      const container = document.querySelector(".calendar-container");
      const rect = container?.getBoundingClientRect();
      const floatPos = rect ? { x: e.clientX - rect.left - 80, y: e.clientY - rect.top - 88 } : undefined;
      openCreatePopup(start, end, true, floatPos);
    }
  };
  // Event block styling helper (fully filled with pastel opacity + left border accent)
  const getEventStyle = (item: CalendarItem) => {
    const tagColor = tags.find(t => t.id === item.tagId)?.color || colors.primary;
    const baseColor = item.color || item.noteColor || tagColor;
    return {
      backgroundColor: baseColor + "1E", // 12% opacity
      border: `1px solid ${baseColor}33`,
      borderLeft: `4px solid ${baseColor}`,
      color: contrastTextColor(baseColor),
    };
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (!item.tagId) return true; // Items without a tag are always shown
    return !hiddenTagIds.includes(item.tagId);
  });

  // Calendar calculations
  const startRange = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
  const endRange = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
  const daysInMonth = eachDayOfInterval({ start: startRange, end: endRange });

  /** Items for a given day. Pinned tasks stay outside the grid until completed. */
  const itemsOnDay = (day: Date) =>
    filteredItems.filter(
      (item) =>
        isSameDay(new Date(item.startAt), day) && (!item.isTask || !taskPositions.isFloating(item.id) || item.completed),
    );

  const floatTaskCard = (task: CalendarItem) => (target: EventTarget | null, offset: { x: number; y: number }) =>
    taskPositions.floatFromDrag(target, offset, task.id, ".calendar-container");

  const renderItemCard = (item: CalendarItem, variant: "month" | "week" | "day", layout?: typeof DEFAULT_EVENT_LAYOUT) =>
    item.isTask ? (
      <CalendarTaskCard
        key={item.id}
        task={item}
        variant={variant}
        layout={layout}
        onOpen={() => openEditPopup(item)}
        onFloat={floatTaskCard(item)}
      />
    ) : (
      <CalendarEventCard
        key={item.id}
        event={item}
        variant={variant}
        layout={layout}
        colorStyle={getEventStyle(item)}
        onOpen={() => openEditPopup(item)}
      />
    );

  return (
      <main className="col-span-12 lg:col-span-9 bg-white rounded-4xl p-6 shadow-sm border border-gray-100 flex flex-col min-h-[600px]">
        {/* Main Grid Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
          <div id="tour-cal-views" className="flex items-center gap-2 bg-primary-soft p-1 rounded-full text-xs font-bold shadow-sm">
            {(["month", "week", "day"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-5 py-2 rounded-full transition-all capitalize ${view === v ? "bg-primary text-white shadow-sm" : "text-ink-muted hover:text-primary"}`}
              >
                {v === "month" ? tc("period.month") : v === "week" ? tc("period.week") : tc("period.day")}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const start = new Date();
              const end = new Date(start.getTime() + 60 * 60 * 1000);
              openCreatePopup(start, end);
            }}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-sm self-stretch sm:self-auto justify-center"
          >
            <Plus className="h-4 w-4" />
            {t("toolbar.createNew")}
          </button>
        </div>

        {/* CALENDAR VIEWS */}
        <div className="flex-1 overflow-x-auto min-h-[500px]">
          {view === "month" && (
            <MonthGrid
              days={daysInMonth}
              month={currentDate}
              className="min-w-[600px] h-full"
              cellClassName="min-h-[100px]"
              listClassName="space-y-1.5 max-h-[120px]"
              onDayClick={handleMonthDayClick}
              onDayDrop={(e, day) => handleDropOnGrid(e, day)}
              renderDayItems={(day) => itemsOnDay(day).map((item) => renderItemCard(item, "month"))}
            />
          )}

          {(view === "week" || view === "day") && (
            <TimeGridView
              currentDate={currentDate} view={view} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot}
              openCreatePopup={openCreatePopup} handleDropOnGrid={handleDropOnGrid}
              itemsOnDay={itemsOnDay} renderItemCard={renderItemCard} showToast={showToast}
            />
          )}
        </div>
      </main>
  );
}
