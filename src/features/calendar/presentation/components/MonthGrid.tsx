"use client";

import type { DragEvent, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { format, isSameDay, isSameMonth } from "date-fns";
import { cn } from "@/shared/ui/components";

interface MonthGridProps {
  /** Complete visible weeks, including dates from adjacent months. */
  days: Date[];
  /** Selected month. Dates outside it appear dimmed. */
  month: Date;
  className?: string;
  /** Extra day-cell classes, such as a minimum height. */
  cellClassName?: string;
  /** Extra classes for the list inside each cell, such as spacing or maximum height. */
  listClassName?: string;
  onDayClick: (day: Date) => void;
  /** Drop handler for a day cell, used by Calendar. */
  onDayDrop?: (event: DragEvent, day: Date) => void;
  renderDayItems: (day: Date) => ReactNode;
}

/** Month grid with weekday headings and day cells. The caller renders each day's items. */
export function MonthGrid({
  days,
  month,
  className,
  cellClassName,
  listClassName,
  onDayClick,
  onDayDrop,
  renderDayItems,
}: MonthGridProps) {
  const tc = useTranslations("common");
  const today = new Date();

  return (
    <div className={cn("grid grid-cols-7 gap-1", className)}>
      {(tc.raw("weekdaysShort") as string[]).map((weekday) => (
        <div key={weekday} className="py-2 text-center text-xs font-bold uppercase text-gray-400">
          {weekday}
        </div>
      ))}

      {days.map((day) => {
        const isToday = isSameDay(day, today);
        return (
          <div
            key={day.toISOString()}
            onDragOver={onDayDrop ? (e) => e.preventDefault() : undefined}
            onDrop={onDayDrop ? (e) => onDayDrop(e, day) : undefined}
            onClick={() => onDayClick(day)}
            className={cn(
              "group flex cursor-pointer flex-col justify-between rounded-2xl border border-gray-50 p-2 transition-colors",
              cellClassName,
              isSameMonth(day, month) ? "bg-white" : "bg-gray-50/50 opacity-40",
              isToday ? "bg-purple-50/20 ring-2 ring-primary/20" : "hover:bg-purple-50/10",
            )}
          >
            <span
              className={cn(
                "self-end rounded-full px-2 py-0.5 text-xs font-black",
                isToday ? "bg-primary text-white" : "text-gray-600",
              )}
            >
              {format(day, "d")}
            </span>
            <div className={cn("mt-2 flex-1 overflow-y-auto scrollbar-thin", listClassName)}>{renderDayItems(day)}</div>
          </div>
        );
      })}
    </div>
  );
}
