import { describe, expect, it } from "vitest";
import { getApiTranslator } from "@/shared/i18n/apiTranslator";
import { reminderWindows, selectDueReminders, vietnamClock, waterLogsSince, waterSlotClocks, type ReminderCandidates } from "./dueReminders";

// 2026-03-10 at 08:30 in Vietnam.
const NOW = new Date("2026-03-10T01:30:00Z");

const t = getApiTranslator();

const empty: ReminderCandidates = { tasks: [], events: [], waterSlots: [], waterLogs: [] };

describe("reminderWindows", () => {
  it("covers tasks due from 30 minutes ago to 15 minutes ahead, events ±15 minutes", () => {
    const { task, event } = reminderWindows(NOW);
    const min = 60 * 1000;
    expect(NOW.getTime() - task.start.getTime()).toBe(30 * min);
    expect(task.end.getTime() - NOW.getTime()).toBe(15 * min);
    expect(NOW.getTime() - event.start.getTime()).toBe(15 * min);
    expect(event.end.getTime() - NOW.getTime()).toBe(15 * min);
  });
});

describe("waterSlotClocks", () => {
  it("lists every Vietnam minute of the last 30 minutes up to now", () => {
    const clocks = waterSlotClocks(NOW);
    expect(clocks).toHaveLength(31);
    expect(clocks[0]).toEqual({ day: "2026-03-10", time: "08:00" });
    expect(clocks.at(-1)).toEqual({ day: "2026-03-10", time: "08:30" });
  });
});

describe("vietnamClock", () => {
  it("converts UTC to Asia/Ho_Chi_Minh day and HH:mm", () => {
    expect(vietnamClock(NOW)).toEqual({ day: "2026-03-10", time: "08:30" });
  });

  it("rolls over to the next day after 17:00 UTC", () => {
    expect(vietnamClock(new Date("2026-03-10T17:05:00Z"))).toEqual({ day: "2026-03-11", time: "00:05" });
  });
});

describe("selectDueReminders", () => {
  it("builds task reminders and skips tasks without due date", () => {
    const dueAt = new Date("2026-03-10T01:25:00Z");
    const reminders = selectDueReminders(NOW, {
      ...empty,
      tasks: [
        { id: "t1", userId: "u1", title: "Nộp báo cáo", dueAt },
        { id: "t2", userId: "u1", title: "Không hạn", dueAt: null },
      ],
    }, t);

    expect(reminders).toEqual([
      {
        kind: "task",
        userId: "u1",
        key: `task_t1_${dueAt.getTime()}`,
        push: { title: "Nhắc nhở công việc ⭐", body: 'Đã đến hạn: "Nộp báo cáo"', url: "/calendar" },
        notice: { title: "Nhắc nhở công việc", message: 'Đã đến hạn: "Nộp báo cáo"' },
      },
    ]);
  });

  it("includes recurring event instances inside the window only, formatted in Vietnam time", () => {
    const reminders = selectDueReminders(NOW, {
      ...empty,
      events: [
        {
          id: "e1",
          userId: "u1",
          title: "Họp",
          // Daily at 08:50 in Vietnam, outside the 08:15–08:45 window.
          startAt: new Date("2026-03-01T01:50:00Z"),
          endAt: new Date("2026-03-01T02:50:00Z"),
          recurrence: "DAILY",
        },
        {
          id: "e2",
          userId: "u2",
          title: "Tập thể dục",
          // Daily at 08:20 in Vietnam, within the 08:15–08:45 window.
          startAt: new Date("2026-03-01T01:20:00Z"),
          endAt: new Date("2026-03-01T02:00:00Z"),
          recurrence: "DAILY",
        },
      ],
    }, t);

    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      kind: "event",
      userId: "u2",
      key: `event_e2_${new Date("2026-03-10T01:20:00Z").getTime()}`,
      push: { title: "Sự kiện sắp diễn ra ⭐", body: 'Lúc 08:20: "Tập thể dục"', url: "/calendar" },
    });
  });

  it("only reminds about one-off events that start inside the window", () => {
    const event = (id: string, startAt: string) => ({
      id,
      userId: "u1",
      title: id,
      startAt: new Date(startAt),
      endAt: new Date(new Date(startAt).getTime() + 3600_000),
      recurrence: null,
    });
    const reminders = selectDueReminders(NOW, {
      ...empty,
      events: [
        event("past", "2026-01-01T01:20:00Z"),
        event("future", "2026-04-10T01:20:00Z"),
        event("now", "2026-03-10T01:20:00Z"),
      ],
    }, t);

    expect(reminders.map((r) => r.key)).toEqual([`event_now_${new Date("2026-03-10T01:20:00Z").getTime()}`]);
  });

  it("reminds water slots that fell anywhere inside the look-back window, keyed by their Vietnam day", () => {
    // At 00:05 on March 11 in Vietnam, the window extends back to 23:35 on March 10.
    const now = new Date("2026-03-10T17:05:00Z");
    const reminders = selectDueReminders(now, {
      ...empty,
      waterSlots: [
        { id: "late", userId: "u1", slotTime: "23:55", amountMl: 100 },
        { id: "early", userId: "u1", slotTime: "00:00", amountMl: 100 },
        { id: "later", userId: "u1", slotTime: "00:10", amountMl: 100 },
      ],
    }, t);
    expect(reminders.map((r) => r.key)).toEqual(["water_late_2026-03-10_23:55", "water_early_2026-03-11_00:00"]);
  });

  it("matches water slots against the current Vietnam HH:mm", () => {
    const reminders = selectDueReminders(NOW, {
      ...empty,
      waterSlots: [
        { id: "w1", userId: "u1", slotTime: "08:30", amountMl: 250 },
        { id: "w2", userId: "u1", slotTime: "09:00", amountMl: 250 },
      ],
    }, t);

    expect(reminders).toEqual([
      {
        kind: "water",
        userId: "u1",
        key: "water_w1_2026-03-10_08:30",
        push: {
          title: "Nhắc nhở uống nước ⭐",
          body: "Đã đến giờ uống nước: 250ml (08:30) 💧",
          url: "/nutrition",
        },
        notice: { title: "Nhắc nhở uống nước", message: "Đến giờ uống nước: 250ml (08:30)" },
      },
    ]);
  });

  it("orders reminders as tasks, events, then water", () => {
    const kinds = selectDueReminders(NOW, {
      tasks: [{ id: "t", userId: "u", title: "T", dueAt: NOW }],
      events: [
        {
          id: "e",
          userId: "u",
          title: "E",
          startAt: NOW,
          endAt: NOW,
          recurrence: "DAILY",
        },
      ],
      waterSlots: [{ id: "w", userId: "u", slotTime: "08:30", amountMl: 100 }],
      waterLogs: [],
    }, t).map((r) => r.kind);

    expect(kinds).toEqual(["task", "event", "water"]);
  });

  it("skips a water slot when the user already drank during that Vietnam hour", () => {
    const reminders = selectDueReminders(NOW, {
      ...empty,
      waterSlots: [
        { id: "w1", userId: "u1", slotTime: "08:15", amountMl: 250 },
        { id: "w2", userId: "u2", slotTime: "08:15", amountMl: 250 },
      ],
      // User u1 drank at 08:05 in Vietnam. User u2's 07:55 log is in a different hour, and another user's log does not count.
      waterLogs: [
        { userId: "u1", loggedAt: new Date("2026-03-10T01:05:00Z") },
        { userId: "u2", loggedAt: new Date("2026-03-10T00:55:00Z") },
      ],
    }, t);
    expect(reminders.map((r) => r.userId)).toEqual(["u2"]);
  });

  it("looks far enough back for water logs of the slot hour", () => {
    // The earliest eligible slot is 08:00. Fetch logs starting in the 07:00 hour.
    expect(waterLogsSince(NOW).getTime()).toBeLessThanOrEqual(new Date("2026-03-10T00:30:00Z").getTime());
  });
});
