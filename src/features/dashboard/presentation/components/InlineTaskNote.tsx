"use client";

import { useTranslations } from "next-intl";
import { motion, type PanInfo } from "framer-motion";
import { Check } from "lucide-react";
import { formatDateTimeShort } from "@/shared/i18n/format";
import { useTapAfterDrag } from "@/features/calendar/presentation/components/useTapAfterDrag";

interface InlineTaskNoteProps {
  task: { id: string; title: string; description?: string | null; dueAt?: string | null };
  backgroundColor: string;
  textColor: string;
  onOpen: () => void;
  onComplete: () => void;
  /** Drag the card out of its row to pin it on the screen. */
  onFloat: (target: EventTarget | null, offset: PanInfo["offset"]) => void;
}

/** Sticky note in the dashboard deadlines row. Click to edit or drag out to pin. */
export function InlineTaskNote({ task, backgroundColor, textColor, onOpen, onComplete, onFloat }: InlineTaskNoteProps) {
  const tc = useTranslations("common");
  const drag = useTapAfterDrag();

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={drag.onDragStart}
      onDragEnd={(e, info) => {
        onFloat(e.target, info.offset);
        drag.onDragEnd();
      }}
      onTap={(e) => {
        if ((e.target as HTMLElement).closest("button") || drag.wasDragged()) return;
        onOpen();
      }}
      initial={{ rotate: -2, scale: 0.95 }}
      whileHover={{ rotate: 0, scale: 1 }}
      // Reset x and y to zero when dropped back into the row so the card returns to its original position.
      style={{ x: 0, y: 0, backgroundColor }}
      className="task-card-ref relative flex h-40 w-36 shrink-0 cursor-grab select-none flex-col justify-between rounded-br-4xl border border-black/5 p-3 shadow-md transition-all active:cursor-grabbing sm:w-[144px]"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        className="absolute right-2 top-2 z-10 rounded-full bg-black/5 p-1 text-gray-700 transition-colors hover:bg-green-500 hover:text-white"
        title={tc("action.done")}
        aria-label={tc("action.done")}
      >
        <Check className="h-3 w-3" />
      </button>

      <div className="mt-1.5 flex min-h-0 flex-1 select-none flex-col justify-between text-left">
        <div className="flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-none">
          <p className="line-clamp-2 break-words pr-3 text-xs font-bold leading-snug sm:text-sm" style={{ color: textColor }}>
            📌 {task.title}
          </p>
          {task.description && (
            <p
              className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-3xs leading-tight"
              style={{ color: textColor, opacity: 0.9 }}
            >
              {task.description}
            </p>
          )}
        </div>
        <p className="mt-1 shrink-0 self-start text-4xs font-bold" style={{ color: textColor, opacity: 0.75 }}>
          {task.dueAt ? formatDateTimeShort(task.dueAt) : tc("schedule.noDeadline")}
        </p>
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0 h-7 w-7 rounded-tl-xl bg-black/5" />
    </motion.div>
  );
}
