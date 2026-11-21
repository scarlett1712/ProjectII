"use client";

import { format } from "date-fns";
import { motion, type PanInfo } from "framer-motion";
import { Clock } from "lucide-react";
import { cn } from "@/shared/ui/components";
import type { CalendarItem } from "../types";
import { calendarTaskBackground, contrastTextColor, taskStatusDotClass } from "../taskNoteColors";
import type { EventLayout } from "../calendarUtils";
import { useTapAfterDrag } from "./useTapAfterDrag";

interface CalendarTaskCardProps {
  task: CalendarItem;
  variant: "month" | "week" | "day";
  /** Position in a week or day column. The month grid does not need it. */
  layout?: EventLayout;
  onOpen: () => void;
  /** Drag an unfinished card out to pin it. Completed cards stay in the grid. */
  onFloat: (target: EventTarget | null, offset: PanInfo["offset"]) => void;
}

/** Task card typography and spacing for narrow week columns and wider day columns. */
const TIMED_CLASSES = {
  week: {
    card: "p-1.5 sm:p-2 rounded-xl hover:scale-[1.02]",
    title: "text-4xs sm:text-4xs leading-[1.15]",
    description: "text-4xs sm:text-4xs mt-0.5 line-clamp-1",
    footer: "mt-0.5 pt-0.5",
    time: "text-4xs sm:text-4xs gap-0.5 max-w-[calc(100%-10px)]",
    clock: "h-2 w-2",
    dot: "h-1.5 w-1.5",
  },
  day: {
    card: "p-2.5 sm:p-3 rounded-2xl hover:scale-[1.01]",
    title: "text-xs leading-snug",
    description: "text-2xs mt-1 line-clamp-2",
    footer: "mt-1.5 pt-1",
    time: "text-2xs gap-1 max-w-[calc(100%-16px)]",
    clock: "h-3 w-3",
    dot: "h-2 w-2",
  },
} as const;

/** Calendar task card. Click to edit or drag it out to pin it. */
export function CalendarTaskCard({ task, variant, layout, onOpen, onFloat }: CalendarTaskCardProps) {
  const drag = useTapAfterDrag();
  const background = calendarTaskBackground(task);
  const dotClass = taskStatusDotClass(task);
  const done = !!task.completed;
  const cursor = done ? "cursor-pointer" : "cursor-grab active:cursor-grabbing";

  const dragProps = {
    drag: !done,
    dragMomentum: false,
    dragElastic: 0,
    onDragStart: () => {
      if (!done) drag.onDragStart();
    },
    onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (done) return;
      onFloat(event.target, info.offset);
      drag.onDragEnd();
    },
    onTap: () => {
      if (!drag.wasDragged()) onOpen();
    },
  };

  if (variant === "month") {
    return (
      <motion.div
        {...dragProps}
        style={{ backgroundColor: background, x: 0, y: 0, opacity: done ? 0.5 : 1 }}
        className={cn(
          "task-card-ref flex select-none items-center justify-between gap-1 rounded-lg border border-yellow-200/25 p-1.5 text-2xs shadow-sm",
          cursor,
        )}
      >
        <span className={cn("flex-1 truncate font-bold text-gray-800", done && "line-through opacity-50")}>📌 {task.title}</span>
        <div className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
      </motion.div>
    );
  }

  const classes = TIMED_CLASSES[variant];
  const textColor = contrastTextColor(background);
  const time = format(new Date(task.startAt), "HH:mm");
  const showDescription = !!task.description && (layout?.height ?? 0) > 65;

  return (
    <motion.div
      {...dragProps}
      style={{
        top: layout?.top,
        height: layout?.height,
        left: layout?.left,
        width: layout?.width,
        x: 0,
        y: 0,
        backgroundColor: background,
        zIndex: 30,
        opacity: done ? 0.5 : 1,
      }}
      className={cn(
        "task-card-ref group/task absolute flex transform select-none flex-col justify-between overflow-hidden border border-yellow-200/25 shadow-md transition-transform hover:z-40",
        classes.card,
        cursor,
      )}
      title={`${task.title} (${time})${task.description ? " - " + task.description : ""}`}
    >
      <div className="flex min-h-0 flex-1 select-none flex-col justify-start overflow-hidden text-left">
        <p className={cn("line-clamp-2 break-words font-bold", classes.title)} style={{ color: textColor }}>
          📌 {task.title}
        </p>
        {showDescription && (
          <p
            className={cn("whitespace-pre-wrap break-words font-medium leading-tight opacity-80", classes.description)}
            style={{ color: textColor }}
          >
            {task.description}
          </p>
        )}
      </div>
      <div className={cn("flex shrink-0 items-center justify-between border-t border-black/5", classes.footer)}>
        <span className={cn("flex items-center truncate font-semibold", classes.time)} style={{ color: textColor, opacity: 0.85 }}>
          <Clock className={cn("shrink-0", classes.clock)} />
          <span className="truncate">{time}</span>
        </span>
        <div className={cn("shrink-0 rounded-full", classes.dot, dotClass)} />
      </div>
    </motion.div>
  );
}
