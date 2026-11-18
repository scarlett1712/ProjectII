import { describe, expect, it } from "vitest";
import {
  generateRecurringInstances,
  generateRecurringTaskInstances,
  getNextRecurrenceDate,
} from "./recurrence";

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
