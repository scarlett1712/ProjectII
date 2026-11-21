import { defaultColors } from "@/shared/theme/palettes";
/** System tag IDs start with "system-" and are never stored in the database. */
export const SYSTEM_TAG_PREFIX = "system-";
export const SYSTEM_TAG_IDS = { event: "system-event", task: "system-task" } as const;

/** The client stores custom names and colors for built-in tags in localStorage. */
export const SYSTEM_TAGS = [
  { id: SYSTEM_TAG_IDS.event, name: "Lịch cố định", color: defaultColors.tag, isSystem: true },
  { id: SYSTEM_TAG_IDS.task, name: "Task", color: defaultColors.note, isSystem: true },
] as const;

export function isSystemTagId(id: string): boolean {
  return id.startsWith(SYSTEM_TAG_PREFIX);
}
