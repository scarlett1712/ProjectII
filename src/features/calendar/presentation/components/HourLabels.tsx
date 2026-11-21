"use client";

import { useTranslations } from "next-intl";
import { hourLabel, visibleHours } from "../timeGrid";

interface HourLabelsProps {
  hiddenHours: number[];
  /** Open the hour menu at the pointer position. */
  onHourClick: (hour: number, x: number, y: number) => void;
}

/** Hour labels along the left edge of the week or day grid. */
export function HourLabels({ hiddenHours, onHourClick }: HourLabelsProps) {
  const tc = useTranslations("common");
  return (
    <div className="col-span-1 flex select-none flex-col border-r border-gray-50">
      {visibleHours(hiddenHours).map((hour) => (
        <div
          key={hour}
          role="button"
          onClick={(e) => {
            e.preventDefault();
            onHourClick(hour, e.clientX, e.clientY);
          }}
          className="flex h-[50px] cursor-pointer items-center justify-center border-b border-gray-50 text-2xs font-bold text-gray-400 transition-colors hover:bg-gray-50"
          title={tc("timeGrid.clickToHide")}
        >
          {hourLabel(hour)}
        </div>
      ))}
    </div>
  );
}
