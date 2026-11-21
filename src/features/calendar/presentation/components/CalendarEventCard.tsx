"use client";

import type { CSSProperties } from "react";
import { format } from "date-fns";
import { cn } from "@/shared/ui/components";
import type { CalendarItem } from "../types";
import type { EventLayout } from "../calendarUtils";

interface CalendarEventCardProps {
  event: CalendarItem;
  variant: "month" | "week" | "day";
  /** Background, border and text derived from the event or tag color. */
  colorStyle: CSSProperties;
  /** Position in a week or day column. The month grid does not need it. */
  layout?: EventLayout;
  onOpen: () => void;
}

const TIMED_CLASSES = {
  week: {
    card: "p-1.5 sm:p-2 rounded-xl text-4xs sm:text-3xs",
    body: "space-y-0.5",
    description: "text-4xs line-clamp-1",
    time: "text-4xs sm:text-4xs mt-0.5",
  },
  day: {
    card: "p-2.5 sm:p-3 rounded-2xl text-xs",
    body: "space-y-1",
    description: "text-2xs line-clamp-2",
    time: "text-3xs mt-1",
  },
} as const;

/** Calendar event card. Click to edit. */
export function CalendarEventCard({ event, variant, colorStyle, layout, onOpen }: CalendarEventCardProps) {
  const open = (e: React.MouseEvent) => {
    // Stop the click from opening the underlying time cell or navigating to its day.
    e.stopPropagation();
    onOpen();
  };

  if (variant === "month") {
    return (
      <div
        onClick={open}
        style={colorStyle}
        className="truncate rounded-r-lg px-2 py-1 text-2xs font-bold transition-all hover:brightness-95"
      >
        {event.title}
      </div>
    );
  }

  const classes = TIMED_CLASSES[variant];
  const timeRange = `${format(new Date(event.startAt), "HH:mm")} - ${format(new Date(event.endAt), "HH:mm")}`;
  const showDescription = !!event.description && (layout?.height ?? 0) > 65;

  return (
    <div
      onClick={open}
      title={`${event.title} (${timeRange})${event.description ? " - " + event.description : ""}`}
      style={{ top: layout?.top, height: layout?.height, left: layout?.left, width: layout?.width, zIndex: 20, ...colorStyle }}
      className={cn(
        "absolute flex cursor-pointer select-none flex-col justify-between overflow-hidden font-bold shadow-sm transition-all hover:z-40 hover:brightness-95",
        classes.card,
      )}
    >
      <div className={cn("min-h-0 flex-1 overflow-hidden", classes.body)}>
        <p className="line-clamp-2 break-words leading-snug">{event.title}</p>
        {showDescription && (
          <p className={cn("mt-0.5 whitespace-pre-wrap break-words font-medium leading-tight opacity-90", classes.description)}>
            {event.description}
          </p>
        )}
      </div>
      <p className={cn("max-w-full shrink-0 self-start truncate font-normal opacity-75", classes.time)}>{timeRange}</p>
    </div>
  );
}
