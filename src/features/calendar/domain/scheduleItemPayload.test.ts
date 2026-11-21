import { describe, expect, it } from "vitest";
import { buildScheduleItemPayload, type ScheduleItemDraft } from "./scheduleItemPayload";

const base: ScheduleItemDraft = {
  itemType: "event",
  title: "  Họp  ",
  description: " ghi chú ",
  startAt: "2026-03-01T09:00",
  endAt: "2026-03-01T10:30",
  allDay: false,
  tagId: "",
  notification: true,
  noteColor: "#fdfd96",
  recurrence: "NONE",
  recurrenceEnd: "",
  completed: false,
};

describe("buildScheduleItemPayload", () => {
  it("builds an event payload with trimmed text and ISO times", () => {
    expect(buildScheduleItemPayload(base)).toEqual({
      title: "Họp",
      description: "ghi chú",
      notification: true,
      noteColor: "#fdfd96",
      color: "#fdfd96",
      tagId: null,
      recurrence: "NONE",
      recurrenceEnd: null,
      startAt: new Date("2026-03-01T09:00").toISOString(),
      endAt: new Date("2026-03-01T10:30").toISOString(),
      allDay: false,
    });
  });

  it("builds a task payload using startAt as optional deadline", () => {
    const payload = buildScheduleItemPayload({ ...base, itemType: "task", startAt: "", tagId: "t1", completed: true });
    expect(payload).toMatchObject({ dueAt: null, completed: true, tagId: "t1" });
    expect(payload).not.toHaveProperty("startAt");
    expect(payload).not.toHaveProperty("endAt");
  });

  it("converts the deadline and recurrence end to ISO", () => {
    const payload = buildScheduleItemPayload({
      ...base,
      itemType: "task",
      recurrence: "DAILY",
      recurrenceEnd: "2026-04-01T23:59",
    });
    expect(payload.dueAt).toBe(new Date("2026-03-01T09:00").toISOString());
    expect(payload.recurrenceEnd).toBe(new Date("2026-04-01T23:59").toISOString());
  });

  it("omits completed when asked so a PATCH keeps the stored state", () => {
    const payload = buildScheduleItemPayload({ ...base, itemType: "task" }, { withCompleted: false });
    expect(payload).not.toHaveProperty("completed");
  });
});
