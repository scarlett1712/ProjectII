import type { CalendarEvent } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/calendarRepository", () => ({
  calendarRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteById: vi.fn(),
    applySeriesWrites: vi.fn(),
  },
}));

vi.mock("../infrastructure/tagRepository", () => ({
  tagRepository: { findAll: vi.fn(), create: vi.fn(), update: vi.fn(), deleteById: vi.fn() },
}));

import { calendarRepository } from "../infrastructure/calendarRepository";
import { tagRepository } from "../infrastructure/tagRepository";
import { createCalendarEventSchema, createTagSchema, updateCalendarEventSchema, updateTagSchema } from "./calendarSchemas";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from "./calendarUseCases";
import { deleteTag, listTags, updateTag } from "./tagUseCases";

const NOW = new Date(2026, 0, 1, 0, 0);
const at = (d: number, h = 9) => new Date(2026, 0, d, h, 0);
const instanceId = (d: Date) => `e1_rec_${d.getTime()}`;

const event: CalendarEvent = {
  id: "e1",
  userId: "u1",
  title: "Họp",
  description: null,
  startAt: at(1, 9),
  endAt: at(1, 10),
  allDay: false,
  tagId: null,
  color: null,
  notification: false,
  noteColor: null,
  recurrence: "DAILY",
  recurrenceEnd: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const writesOf = (call = 0) => vi.mocked(calendarRepository.applySeriesWrites).mock.calls[call][2];

describe("calendar use cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.mocked(calendarRepository.findById).mockResolvedValue(event);
  });
  afterEach(() => vi.useRealTimers());

  it("listCalendarEvents expands recurring events", async () => {
    vi.mocked(calendarRepository.findAll).mockResolvedValue([event]);
    const items = await listCalendarEvents("u1", { start: at(1), end: at(2) });
    expect(items.map((i) => i.id)).toEqual([instanceId(at(1)), instanceId(at(2))]);
  });

  it("createCalendarEvent keeps tagId as sent and defaults the rest", async () => {
    await createCalendarEvent(
      "u1",
      createCalendarEventSchema.parse({ title: "A", startAt: at(1).toISOString(), endAt: at(1, 10).toISOString(), tagId: "" }),
    );
    expect(calendarRepository.create).toHaveBeenCalledWith("u1", {
      title: "A",
      description: null,
      startAt: at(1),
      endAt: at(1, 10),
      allDay: false,
      tagId: "",
      color: null,
      notification: false,
      noteColor: null,
      recurrence: null,
      recurrenceEnd: null,
    });
  });

  describe("updateCalendarEvent", () => {
    it("defaults an instance id to mode one and keeps the duration", async () => {
      await updateCalendarEvent("u1", { id: instanceId(at(3)), title: "X" });
      expect(writesOf()).toEqual([
        { op: "updateParent", data: { recurrenceEnd: new Date(at(3).getTime() - 1000) } },
        expect.objectContaining({ op: "create", data: expect.objectContaining({ startAt: at(4), endAt: at(4, 10), title: "Họp" }) }),
        expect.objectContaining({ op: "create", data: expect.objectContaining({ startAt: at(3), endAt: at(3, 10), title: "X", recurrence: "NONE" }) }),
      ]);
    });

    it("mode one limits an open-ended continuation to 6 months from now (same as tasks)", async () => {
      vi.setSystemTime(new Date(2025, 0, 1));
      await updateCalendarEvent("u1", { id: instanceId(at(3)) }, "one");
      expect(writesOf().map((w) => w.op)).toEqual(["updateParent", "create"]);
    });

    it("mode one on the first occurrence shifts the parent, or deletes it when nothing remains", async () => {
      await updateCalendarEvent("u1", { id: "e1" }, "one");
      expect(writesOf()[0]).toEqual({ op: "updateParent", data: { startAt: at(2), endAt: at(2, 10) } });

      vi.mocked(calendarRepository.findById).mockResolvedValue({ ...event, recurrenceEnd: at(1, 12) });
      await updateCalendarEvent("u1", { id: "e1" }, "one");
      expect(writesOf(1)[0]).toEqual({ op: "deleteParent" });
    });

    it("mode future from the first occurrence updates the parent", async () => {
      await updateCalendarEvent("u1", { id: instanceId(at(1)), title: "Y" }, "future");
      expect(writesOf()).toEqual([
        { op: "updateParent", data: expect.objectContaining({ title: "Y", startAt: at(1), endAt: at(1, 10) }) },
      ]);
    });

    it("mode future from a later occurrence splits the series", async () => {
      await updateCalendarEvent("u1", { id: instanceId(at(5)), startAt: at(5, 14), endAt: at(5, 15) }, "future");
      expect(writesOf()).toEqual([
        { op: "updateParent", data: { recurrenceEnd: new Date(at(5).getTime() - 1000) } },
        { op: "create", data: expect.objectContaining({ startAt: at(5, 14), endAt: at(5, 15), recurrence: "DAILY" }) },
      ]);
    });

    it("mode all updates only the sent fields and keeps recurrenceEnd when it is not sent (same as tasks)", async () => {
      await updateCalendarEvent("u1", updateCalendarEventSchema.parse({ id: "e1", title: "Z", startAt: "" }), "all");
      expect(calendarRepository.update).toHaveBeenCalledWith("u1", "e1", { title: "Z" });
    });

    it("mode all clears recurrenceEnd only when sent as null", async () => {
      await updateCalendarEvent("u1", updateCalendarEventSchema.parse({ id: "e1", recurrenceEnd: null }), "all");
      expect(calendarRepository.update).toHaveBeenCalledWith("u1", "e1", { recurrenceEnd: null });
    });

    it("mode all on an instance id updates the series id (no Prisma P2025)", async () => {
      await updateCalendarEvent("u1", { id: instanceId(at(3)), title: "Z" }, "all");
      expect(calendarRepository.update).toHaveBeenCalledWith("u1", "e1", { title: "Z" });
    });

    it("rejects a malformed instance id with 400", async () => {
      await expect(updateCalendarEvent("u1", { id: "e1_rec_abc" })).rejects.toMatchObject({ status: 400, code: "calendar.event.invalidId" });
    });

    it("404s for a missing series", async () => {
      vi.mocked(calendarRepository.findById).mockResolvedValue(null);
      await expect(updateCalendarEvent("u1", { id: "e9" })).rejects.toMatchObject({ status: 404, code: "calendar.event.notFound" });
    });
  });

  describe("deleteCalendarEvent", () => {
    it("mode all on an instance deletes the series by its series id, without a lookup", async () => {
      await deleteCalendarEvent("u1", instanceId(at(3)), "all");
      expect(calendarRepository.findById).not.toHaveBeenCalled();
      expect(calendarRepository.deleteById).toHaveBeenCalledWith("u1", "e1");
    });

    it("an instance id without a mode (or an unknown mode) removes only that occurrence (same as tasks)", async () => {
      await deleteCalendarEvent("u1", instanceId(at(3)), null);
      await deleteCalendarEvent("u1", instanceId(at(3)), "weird");
      const onlyThis = [
        { op: "updateParent", data: { recurrenceEnd: new Date(at(3).getTime() - 1000) } },
        { op: "create", data: expect.objectContaining({ startAt: at(4) }) },
      ];
      expect(writesOf(0)).toEqual(onlyThis);
      expect(writesOf(1)).toEqual(onlyThis);
      expect(calendarRepository.deleteById).not.toHaveBeenCalled();
    });

    it("404s for an instance of a missing series", async () => {
      vi.mocked(calendarRepository.findById).mockResolvedValue(null);
      await expect(deleteCalendarEvent("u1", instanceId(at(3)), "one")).rejects.toMatchObject({ status: 404 });
    });

    it("mode future deletes or truncates", async () => {
      await deleteCalendarEvent("u1", instanceId(at(1)), "future");
      await deleteCalendarEvent("u1", instanceId(at(4)), "future");
      expect(writesOf(0)).toEqual([{ op: "deleteParent" }]);
      expect(writesOf(1)).toEqual([{ op: "updateParent", data: { recurrenceEnd: new Date(at(4).getTime() - 1000) } }]);
    });

    it("mode one on a series id removes the first occurrence of a recurring event", async () => {
      await deleteCalendarEvent("u1", "e1", "one");
      expect(writesOf()).toEqual([{ op: "updateParent", data: { startAt: at(2), endAt: at(2, 10) } }]);
      expect(calendarRepository.deleteById).not.toHaveBeenCalled();
    });

    it("mode one on a non-recurring or missing event deletes it", async () => {
      vi.mocked(calendarRepository.findById).mockResolvedValue({ ...event, recurrence: "NONE" });
      await deleteCalendarEvent("u1", "e1", "one");
      vi.mocked(calendarRepository.findById).mockResolvedValue(null);
      await deleteCalendarEvent("u1", "e1", "one");
      expect(calendarRepository.deleteById).toHaveBeenCalledTimes(2);
    });
  });
});

describe("tag use cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists system tags first", async () => {
    vi.mocked(tagRepository.findAll).mockResolvedValue([]);
    const tags = await listTags("u1");
    expect(tags.map((t) => t.id)).toEqual(["system-event", "system-task"]);
  });

  it("refuses to change system tags", async () => {
    await expect(updateTag("u1", { id: "system-task", name: "a", color: "b" })).rejects.toMatchObject({
      status: 400,
      code: "calendar.tag.systemTagNotEditable",
    });
    await expect(deleteTag("u1", "system-event")).rejects.toMatchObject({ code: "calendar.tag.systemTagNotDeletable" });
    expect(tagRepository.update).not.toHaveBeenCalled();
    expect(tagRepository.deleteById).not.toHaveBeenCalled();
  });

  it("schemas trim values and keep the old message codes", () => {
    expect(createTagSchema.parse({ name: " Học ", color: " #fff " })).toEqual({ name: "Học", color: "#fff" });
    expect(createTagSchema.safeParse({ name: "a" }).error?.issues[0].message).toBe("calendar.tag.missingFields");
    expect(updateTagSchema.safeParse({ name: "a", color: "b" }).error?.issues[0].message).toBe("calendar.tag.missingInfo");
  });
});
