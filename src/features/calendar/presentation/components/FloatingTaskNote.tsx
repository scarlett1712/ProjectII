"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { formatDateTimeShort } from "@/shared/i18n/format";
import type { TaskPosition } from "./useTaskPositions";
import { useTapAfterDrag } from "./useTapAfterDrag";

interface FloatingTaskNoteProps {
  task: { id: string; title: string; description?: string | null; dueAt?: string | null };
  position: TaskPosition;
  backgroundColor: string;
  textColor: string;
  /** Temporarily hide the note while preserving its position, for example while editing it. */
  hidden?: boolean;
  onMove: (offset: TaskPosition) => void;
  onOpen: () => void;
  onComplete: () => void;
  onUnpin: () => void;
}

const cornerButtonClasses = "absolute top-2 z-10 rounded-xl bg-black/5 p-1 text-gray-700 transition-colors";

/** Pinned sticky note. Drag to move, click to edit, or use its controls to complete or unpin it. */
export function FloatingTaskNote({
  task,
  position,
  backgroundColor,
  textColor,
  hidden = false,
  onMove,
  onOpen,
  onComplete,
  onUnpin,
}: FloatingTaskNoteProps) {
  const tc = useTranslations("common");
  const drag = useTapAfterDrag();

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={drag.onDragStart}
      onDragEnd={(_, info) => {
        onMove(info.offset);
        drag.onDragEnd();
      }}
      onTap={(e) => {
        // Ignore corner-button clicks and taps immediately following a drag.
        if ((e.target as HTMLElement).closest("button") || drag.wasDragged()) return;
        onOpen();
      }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        x: position.x,
        y: position.y,
        backgroundColor,
        zIndex: 100,
        display: hidden ? "none" : "flex",
      }}
      className="flex h-44 w-40 cursor-grab select-none flex-col justify-between rounded-br-5xl border border-black/5 p-4 shadow-xl active:cursor-grabbing"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        className={`${cornerButtonClasses} left-2 hover:bg-green-500 hover:text-white`}
        title={tc("action.done")}
        aria-label={tc("action.done")}
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUnpin();
        }}
        className={`${cornerButtonClasses} right-2 hover:bg-black/10 hover:text-red-500`}
        title={tc("schedule.removeFromScreen")}
        aria-label={tc("schedule.removeFromScreen")}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="mt-5 flex min-h-0 flex-1 select-none flex-col justify-between text-left">
        <p className="shrink-0 break-words pr-4 text-sm font-bold leading-snug" style={{ color: textColor }}>
          📌 {task.title}
        </p>
        <div className="mt-1 flex-1 overflow-y-auto pr-1">
          {task.description && (
            <p className="whitespace-pre-wrap break-words text-2xs leading-tight" style={{ color: textColor, opacity: 0.9 }}>
              {task.description}
            </p>
          )}
        </div>
        <p className="mt-2 shrink-0 self-start text-3xs font-bold" style={{ color: textColor, opacity: 0.75 }}>
          {task.dueAt ? formatDateTimeShort(task.dueAt) : tc("schedule.noDeadline")}
        </p>
      </div>

      {/* Peeled paper corner. */}
      <div className="pointer-events-none absolute bottom-0 right-0 h-10 w-10 rounded-tl-xl bg-black/5" />
    </motion.div>
  );
}
