"use client";

import { useTranslations } from "next-intl";
import { format, isSameDay } from "date-fns";
import { formatDate } from "@/shared/i18n/format";
import { cn } from "@/shared/ui/components";

interface TimeGridHeaderProps {
  view: "week" | "day";
  /** Seven dates for week view. */
  weekDays: Date[];
  /** Selected date in day view. */
  date: Date;
  hiddenCount: number;
  onShowAllHours: () => void;
}

/** Week and day grid headings. Click the hour heading to restore hidden hours. */
export function TimeGridHeader({ view, weekDays, date, hiddenCount, onShowAllHours }: TimeGridHeaderProps) {
  const tc = useTranslations("common");
  const hasHidden = hiddenCount > 0;

  return (
    <div className="grid grid-cols-8 border-b border-gray-100 py-3">
      <div
        role={hasHidden ? "button" : undefined}
        onClick={() => {
          if (hasHidden) onShowAllHours();
        }}
        className={cn("col-span-1 text-center text-xs font-bold text-gray-400", hasHidden && "cursor-pointer text-primary underline")}
      >
        {hasHidden ? tc("timeGrid.showHidden", { count: String(hiddenCount) }) : tc("timeGrid.hour")}
      </div>
      {view === "week" ? (
        weekDays.map((day) => (
          <div key={day.toISOString()} className="col-span-1 flex flex-col items-center text-center">
            <span className="text-2xs font-bold uppercase text-gray-400">{formatDate(day, "E")}</span>
            <span
              className={cn(
                "mt-0.5 rounded-full px-2.5 py-0.5 text-base font-black",
                isSameDay(day, new Date()) ? "bg-primary text-white" : "text-gray-700",
              )}
            >
              {format(day, "d")}
            </span>
          </div>
        ))
      ) : (
        <div className="col-span-7 flex flex-col items-center text-center">
          <span className="text-2xs font-bold uppercase text-gray-400">{formatDate(date, "EEEE")}</span>
          <span className="mt-0.5 rounded-full bg-primary px-2.5 py-0.5 text-base font-black text-white">{format(date, "d")}</span>
        </div>
      )}
    </div>
  );
}
