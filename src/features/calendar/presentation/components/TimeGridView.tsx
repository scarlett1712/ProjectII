import { useState } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, setHours, setMinutes } from "date-fns";
import { CalendarItem } from "@/features/calendar/presentation/types";
import { DEFAULT_EVENT_LAYOUT, getEventLayoutStyles } from "@/features/calendar/presentation/calendarUtils";
import { STORAGE_KEYS } from "@/shared/client/storageKeys";
import { visibleHours, dayColumnHeight } from "@/features/calendar/presentation/timeGrid";
import { useHiddenHours } from "@/features/calendar/presentation/components/useHiddenHours";
import { TimeGridHeader } from "@/features/calendar/presentation/components/TimeGridHeader";
import { HourLabels } from "@/features/calendar/presentation/components/HourLabels";
import { HourContextMenu } from "@/features/calendar/presentation/components/HourContextMenu";

interface TimeGridViewProps {
  currentDate: Date;
  view: "week" | "day";
  selectedSlot: { date: Date; hour: number } | null;
  setSelectedSlot: (slot: { date: Date; hour: number }) => void;
  openCreatePopup: (start: Date, end: Date) => void;
  handleDropOnGrid: (event: React.DragEvent, day: Date, hour: number) => void;
  itemsOnDay: (day: Date) => CalendarItem[];
  renderItemCard: (item: CalendarItem, view: "week" | "day", layout: typeof DEFAULT_EVENT_LAYOUT) => React.ReactNode;
  showToast: (message: string) => void;
}

export function TimeGridView({
  currentDate, view, selectedSlot, setSelectedSlot, openCreatePopup,
  handleDropOnGrid, itemsOnDay, renderItemCard, showToast,
}: TimeGridViewProps) {
  const { hiddenHours, hourMenu, openHourMenu, closeHourMenu, hideHour, showAllHours } = useHiddenHours(
    STORAGE_KEYS.calendarHiddenHours,
    showToast,
  );
  // Drag selection state for time grid
  const [dragStart, setDragStart] = useState<{ date: Date; hour: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ date: Date; hour: number } | null>(null);
  const [isDraggingGrid, setIsDraggingGrid] = useState(false);
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
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 })
  });
  /** Hour cells for one day. Drag to select a time range or drop a note to create a task. */
  const renderHourCells = (day: Date, cellClassName = "") =>
    visibleHours(hiddenHours).map((hour) => {
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
          className={`h-[50px] border-b border-gray-50 transition-colors ${cellClassName} ${
            isSelected ? "bg-purple-100/40" :
            isSelectedSlot ? "ring-2 ring-inset ring-primary/40 bg-purple-50/10" : "hover:bg-purple-50/10"
          }`}
        />
      );
    });

  /** Position event and task cards within the hour column, placing overlapping items side by side. */
  const renderTimedItems = (day: Date, variant: "week" | "day") => {
    const dayItems = itemsOnDay(day);
    const layouts = getEventLayoutStyles(dayItems, day, hiddenHours);
    return dayItems.map((item) => {
      const layout = layouts[item.id] || DEFAULT_EVENT_LAYOUT;
      return layout.visible ? renderItemCard(item, variant, layout) : null;
    });
  };
  return (
    <>
      <div className="min-w-[600px] h-full flex flex-col" onMouseLeave={handleGridMouseUp}>
        <TimeGridHeader
          view={view}
          weekDays={weekDays}
          date={currentDate}
          hiddenCount={hiddenHours.length}
          onShowAllHours={showAllHours}
        />

        {/* Hour Grid and Columns */}
        <div className="flex-1 overflow-y-auto max-h-[600px] relative scrollbar-thin">
          <div className="grid grid-cols-8 relative">
            <HourLabels hiddenHours={hiddenHours} onHourClick={openHourMenu} />

            {view === "week" ? (
              weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  style={{ height: `${dayColumnHeight(hiddenHours)}px` }}
                  className={`col-span-1 relative border-r border-gray-50 ${isSameDay(day, new Date()) ? "bg-purple-50/5" : ""}`}
                >
                  {renderHourCells(day, "hour-cell")}
                  {renderTimedItems(day, "week")}
                </div>
              ))
            ) : (
              <div style={{ height: `${dayColumnHeight(hiddenHours)}px` }} className="col-span-7 relative day-cell">
                {renderHourCells(currentDate)}
                {renderTimedItems(currentDate, "day")}
              </div>
            )}
          </div>
        </div>
      </div>
      <HourContextMenu
        menu={hourMenu}
        canShowAll={hiddenHours.length > 0}
        onHide={hideHour}
        onShowAll={showAllHours}
        onClose={closeHourMenu}
      />
    </>
  );
}
