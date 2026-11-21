import { describe, expect, it } from "vitest";
import {
  expandSeries,
  generateRecurringInstances,
  generateRecurringTaskInstances,
  getNextRecurrenceDate,
} from "@/shared/domain/recurrence";

describe("recurrence.ts", () => {
  it("computes next recurrence dates correctly", () => {
    const base = new Date(2026, 0, 1);
    expect(getNextRecurrenceDate(base, "DAILY").getDate()).toBe(2);
    expect(getNextRecurrenceDate(base, "WEEKLY").getDate()).toBe(8);
    expect(getNextRecurrenceDate(base, "MONTHLY").getMonth()).toBe(1);
    expect(getNextRecurrenceDate(base, "NONE")).toEqual(base);
  });

  it("returns single event if recurrence is NONE or missing", () => {
    const event = {
      id: "ev-1",
      startAt: new Date(2026, 0, 1, 10, 0),
      endAt: new Date(2026, 0, 1, 11, 0),
      recurrence: "NONE",
    };
    const instances = generateRecurringInstances(
      event,
      new Date(2026, 0, 1),
      new Date(2026, 0, 31)
    );
    expect(instances.length).toBe(1);
    expect(instances[0].id).toBe("ev-1");
  });

  it("generates daily recurring instances within time window", () => {
    const event = {
      id: "ev-daily",
      startAt: new Date(2026, 0, 1, 10, 0),
      endAt: new Date(2026, 0, 1, 11, 0),
      recurrence: "DAILY",
      recurrenceEnd: new Date(2026, 0, 5, 23, 59),
    };
    const instances = generateRecurringInstances(
      event,
      new Date(2026, 0, 1),
      new Date(2026, 0, 10)
    );
    expect(instances.length).toBe(5);
    expect(instances[0].originalId).toBe("ev-daily");
    expect(instances[0].id).toContain("_rec_");
  });

  it("generates recurring task instances correctly", () => {
    const task = {
      id: "task-weekly",
      title: "Weekly report",
      dueAt: new Date(2026, 0, 1, 9, 0),
      recurrence: "WEEKLY",
      recurrenceEnd: new Date(2026, 0, 22, 23, 59, 59),
    };
    const instances = generateRecurringTaskInstances(
      task,
      new Date(2026, 0, 1),
      new Date(2026, 0, 31)
    );
    expect(instances.length).toBe(4);
    expect(instances[0].originalId).toBe("task-weekly");
    expect(instances[0].completed).toBe(false);
  });
});

describe("fast-forwarding long-running series", () => {
  it("yields the same daily instances as stepping one day at a time, without iterating from the series start", async () => {
    const { generateRecurringInstances } = await import("./recurrence");
    const event = {
      id: "e",
      startAt: new Date("1990-01-01T09:00:00Z"),
      endAt: new Date("1990-01-01T10:00:00Z"),
      recurrence: "DAILY",
      recurrenceEnd: new Date("2030-01-01T00:00:00Z"),
    };
    const windowStart = new Date("2026-03-10T00:00:00Z");
    const windowEnd = new Date("2026-03-12T23:59:59Z");
    const ids = generateRecurringInstances(event, windowStart, windowEnd).map((i) => i.startAt.toISOString());
    expect(ids).toEqual(["2026-03-10T09:00:00.000Z", "2026-03-11T09:00:00.000Z", "2026-03-12T09:00:00.000Z"]);
  });

  it("keeps weekly instances aligned to the series weekday", async () => {
    const { generateRecurringTaskInstances } = await import("./recurrence");
    const task = { id: "t", dueAt: new Date("2000-01-03T08:00:00Z"), recurrence: "WEEKLY", recurrenceEnd: null };
    const instances = generateRecurringTaskInstances(task, new Date("2026-03-01T00:00:00Z"), new Date("2026-03-15T00:00:00Z"));
    expect(instances.map((i) => i.dueAt.toISOString())).toEqual(["2026-03-02T08:00:00.000Z", "2026-03-09T08:00:00.000Z"]);
  });
});

describe("monthly recurrence on the Vietnam calendar", () => {
  it("keeps an early-morning (VN) event on the same day of month even though the server runs UTC", async () => {
    const { generateRecurringInstances } = await import("./recurrence");
    // 05:00 on the first day of a month in Vietnam is 22:00 UTC on the final day of the previous month.
    const event = {
      id: "m",
      startAt: new Date("2026-02-28T22:00:00Z"),
      endAt: new Date("2026-02-28T23:00:00Z"),
      recurrence: "MONTHLY",
      recurrenceEnd: new Date("2026-06-01T00:00:00Z"),
    };
    const starts = generateRecurringInstances(event, new Date("2026-02-01T00:00:00Z"), new Date("2026-06-01T00:00:00Z")).map((i) =>
      new Date(i.startAt).toISOString(),
    );
    expect(starts).toEqual([
      "2026-02-28T22:00:00.000Z",
      "2026-03-31T22:00:00.000Z",
      "2026-04-30T22:00:00.000Z",
      "2026-05-31T22:00:00.000Z",
    ]);
  });
});

describe("expandSeries", () => {
  const window = { start: new Date(2026, 0, 1), end: new Date(2026, 0, 3, 23) };

  it("returns a non-recurring item as is", () => {
    const item = { id: "x", at: new Date(2026, 0, 1), recurrence: "NONE" };
    expect(expandSeries(item, (i) => i.at, () => ({}), window)).toEqual([item]);
  });

  it("builds ids from the series id and lets the caller set per-instance fields", () => {
    const item = { id: "x", at: new Date(2026, 0, 1, 9), recurrence: "DAILY", recurrenceEnd: null };
    const instances = expandSeries(item, (i) => i.at, (_, start) => ({ at: start }), window);
    expect(instances.map((i) => [i.id, i.at, i.originalId, i.isRecurringInstance])).toEqual(
      [1, 2, 3].map((d) => {
        const at = new Date(2026, 0, d, 9);
        return [`x_rec_${at.getTime()}`, at, "x", true];
      }),
    );
  });

  it("tasks start at createdAt without a due date; events keep their duration", () => {
    const task = { id: "t", dueAt: null, createdAt: new Date(2026, 0, 2, 8), recurrence: "DAILY" };
    expect(generateRecurringTaskInstances(task, window.start, window.end).map((i) => i.dueAt)).toEqual([
      new Date(2026, 0, 2, 8),
      new Date(2026, 0, 3, 8),
    ]);
    const event = { id: "e", startAt: new Date(2026, 0, 3, 9), endAt: new Date(2026, 0, 3, 11), recurrence: "WEEKLY" };
    expect(generateRecurringInstances(event, window.start, window.end)).toMatchObject([
      { startAt: new Date(2026, 0, 3, 9), endAt: new Date(2026, 0, 3, 11) },
    ]);
  });
});
