/** Task urgency based on its deadline. */
export type TaskUrgency = "critical" | "warning" | "normal";

const HOUR_MS = 60 * 60 * 1000;

/**
 * A past deadline or less than two hours remaining is critical. Less than 24 hours is a warning.
 * Later deadlines are normal. Return null for tasks without a deadline so each screen can choose its presentation.
 */
export function taskUrgency(dueAt: string | Date | null | undefined, now: Date = new Date()): TaskUrgency | null {
  if (!dueAt) return null;
  const hours = (new Date(dueAt).getTime() - now.getTime()) / HOUR_MS;
  if (hours < 2) return "critical";
  if (hours < 24) return "warning";
  return "normal";
}
