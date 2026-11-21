import { describe, expect, it } from "vitest";
import { SYSTEM_TAG_IDS } from "@/features/calendar/domain/systemTags";
import { emptyScheduleItemDraft, startAtPatch, switchItemType } from "./scheduleItemForm";

describe("emptyScheduleItemDraft", () => {
  it("applies overrides on top of defaults", () => {
    const draft = emptyScheduleItemDraft({ itemType: "task", notification: true });
    expect(draft).toMatchObject({ itemType: "task", notification: true, recurrence: "NONE", title: "" });
  });
});

describe("switchItemType", () => {
  it("selects the event tag and turns notification off for events", () => {
    expect(switchItemType("event", "2026-01-01T09:00")).toEqual({
      itemType: "event",
      tagId: SYSTEM_TAG_IDS.event,
      notification: false,
    });
  });

  it("clears the tag and notifies only with a deadline for tasks", () => {
    expect(switchItemType("task", "")).toEqual({ itemType: "task", tagId: "", notification: false });
    expect(switchItemType("task", "2026-01-01T09:00")).toMatchObject({ notification: true });
  });
});

describe("startAtPatch", () => {
  it("only changes the start of events", () => {
    expect(startAtPatch("event", "2026-01-01T09:00")).toEqual({ startAt: "2026-01-01T09:00" });
  });

  it("follows the deadline with the notification flag for tasks", () => {
    expect(startAtPatch("task", "2026-01-01T09:00")).toEqual({ startAt: "2026-01-01T09:00", notification: true });
    expect(startAtPatch("task", "")).toEqual({ startAt: "", notification: false });
  });
});
