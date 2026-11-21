import { describe, expect, it } from "vitest";
import { sentFields, writesForPlan } from "@/shared/domain/recurringSeries";
import {
  detachedEventFields,
  editedSeriesFields,
  eventSeries,
  eventSeriesSnapshot,
  type CalendarEvent,
} from "./eventSeries";

const HOUR = 60 * 60 * 1000;
const at = (d: number, h = 9) => new Date(2026, 0, d, h, 0);
const event: CalendarEvent = {
  id: "e1",
  title: "Họp",
  description: null,
  startAt: at(1, 9),
  endAt: at(1, 11),
  allDay: false,
  tagId: "tag",
  color: null,
  notification: true,
  noteColor: null,
  recurrence: "WEEKLY",
  recurrenceEnd: null,
};

describe("eventSeriesSnapshot", () => {
  it("starts at startAt", () => {
    expect(eventSeriesSnapshot(event)).toEqual({ start: at(1), recurrence: "WEEKLY", recurrenceEnd: null });
  });
});

describe("eventWritesForPlan", () => {
  it("shifts the parent keeping the duration", () => {
    expect(writesForPlan(eventSeries, event, { kind: "shiftParent", nextStart: at(8) })).toEqual([
      { op: "updateParent", data: { startAt: at(8), endAt: at(8, 11) } },
    ]);
  });

  it("creates a continuation copy with the same duration", () => {
    const writes = writesForPlan(eventSeries, event, {
      kind: "truncateParent",
      recurrenceEnd: new Date(at(15).getTime() - 1000),
      continuationStart: at(22),
    });
    expect(writes[1]).toEqual({
      op: "create",
      data: {
        title: "Họp",
        description: null,
        startAt: at(22),
        endAt: at(22, 11),
        allDay: false,
        tagId: "tag",
        color: null,
        notification: true,
        noteColor: null,
        recurrence: "WEEKLY",
        recurrenceEnd: null,
      },
    });
  });
});

describe("detachedEventFields", () => {
  it("defaults to the instance time with the original duration", () => {
    expect(detachedEventFields(event, {}, at(15))).toMatchObject({
      startAt: at(15),
      endAt: new Date(at(15).getTime() + 2 * HOUR),
      recurrence: "NONE",
      recurrenceEnd: null,
    });
  });

  it("keeps tagId as sent (no empty → null coercion for events)", () => {
    expect(detachedEventFields(event, { tagId: "" }, at(15)).tagId).toBe("");
    expect(detachedEventFields(event, { tagId: null }, at(15)).tagId).toBeNull();
  });
});

describe("editedSeriesFields", () => {
  it("applies new times and recurrence", () => {
    const fields = editedSeriesFields(event, { startAt: at(16, 8), endAt: at(16, 9), recurrence: "DAILY" }, at(15));
    expect(fields).toMatchObject({ startAt: at(16, 8), endAt: at(16, 9), recurrence: "DAILY", recurrenceEnd: null });
  });
});

describe("sentFields (mode all)", () => {
  it("keeps recurrenceEnd when it is not sent (same as tasks), clears it only when sent as null", () => {
    expect(sentFields({ title: "x", startAt: undefined })).toEqual({ title: "x" });
    expect(sentFields({ recurrenceEnd: null })).toEqual({ recurrenceEnd: null });
  });
});
