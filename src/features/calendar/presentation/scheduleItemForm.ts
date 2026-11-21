import { defaultColors } from "@/shared/theme/palettes";
import { SYSTEM_TAG_IDS } from "@/features/calendar/domain/systemTags";
import type { ScheduleItemDraft, ScheduleItemType } from "@/features/calendar/domain/scheduleItemPayload";

/** Partial form update. Individual fields send only their changes to the parent. */
export type ScheduleDraftChange = (patch: Partial<ScheduleItemDraft>) => void;

/** Empty event draft with no tag or reminder and the default yellow note color. */
export function emptyScheduleItemDraft(overrides: Partial<ScheduleItemDraft> = {}): ScheduleItemDraft {
  return {
    itemType: "event",
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    allDay: false,
    tagId: "",
    notification: false,
    noteColor: defaultColors.note,
    recurrence: "NONE",
    recurrenceEnd: "",
    completed: false,
    ...overrides,
  };
}

/**
 * Switching to an event selects the event tag and disables reminders. A task starts without a tag and enables reminders when it has a deadline.
 */
export function switchItemType(type: ScheduleItemType, startAt: string): Partial<ScheduleItemDraft> {
  return type === "event"
    ? { itemType: type, tagId: SYSTEM_TAG_IDS.event, notification: false }
    : { itemType: type, tagId: "", notification: startAt !== "" };
}

/** Changing a task deadline enables reminders when set and disables them when cleared. */
export function startAtPatch(itemType: ScheduleItemType, startAt: string): Partial<ScheduleItemDraft> {
  return itemType === "task" ? { startAt, notification: startAt !== "" } : { startAt };
}
