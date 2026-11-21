import { colors } from "@/shared/theme/tokens";
import { defaultNoteYellows } from "@/shared/theme/palettes";
import { darkenedTextColor } from "@/shared/theme/colorMath";
import { taskUrgency, type TaskUrgency } from "@/features/calendar/domain/taskUrgency";

interface NoteLike {
  noteColor?: string | null;
  completed?: boolean | null;
  dueAt?: string | null;
}

/** Custom note color. Treat the default yellow shades as an unset color. */
export function customNoteColor(noteColor: string | null | undefined): string | undefined {
  return noteColor && !defaultNoteYellows.includes(noteColor.toLowerCase()) ? noteColor : undefined;
}

/** Readable text color for the card background, defaulting to dark text when there is no background. */
export function contrastTextColor(backgroundHex: string | null | undefined): string {
  return backgroundHex ? darkenedTextColor(backgroundHex) : colors.inkStrong;
}

const URGENCY_BACKGROUND: Record<TaskUrgency, string> = {
  critical: colors.urgencyCritical,
  warning: colors.urgencyWarning,
  normal: colors.urgencyNormal,
};

const URGENCY_DOT_CLASS: Record<TaskUrgency, string> = {
  critical: "bg-urgency-critical",
  warning: "bg-urgency-warning",
  normal: "bg-urgency-normal",
};

/** Calendar task cards use their custom color, or gray when completed and yellow otherwise. A dot indicates urgency. */
export function calendarTaskBackground(task: NoteLike): string {
  return customNoteColor(task.noteColor) ?? (task.completed ? colors.surfaceMuted : colors.note);
}

/** Calendar status dot: gray for completed tasks and normal urgency for tasks without a deadline. */
export function taskStatusDotClass(task: NoteLike, now: Date = new Date()): string {
  if (task.completed) return "bg-gray-400";
  return URGENCY_DOT_CLASS[taskUrgency(task.dueAt, now) ?? "normal"];
}

/** Dashboard task backgrounds use gray for completed tasks, then a custom color, yellow without a deadline, or the urgency color. */
export function dashboardTaskBackground(task: NoteLike, now: Date = new Date()): string {
  if (task.completed) return colors.surfaceMuted;
  const custom = customNoteColor(task.noteColor);
  if (custom) return custom;
  const urgency = taskUrgency(task.dueAt, now);
  return urgency ? URGENCY_BACKGROUND[urgency] : colors.note;
}
