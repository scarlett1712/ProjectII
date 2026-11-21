import { describe, expect, it } from "vitest";
import { dueWaterSlots } from "./dueWaterSlots";

// 08:20 on the local machine. This test uses only local time in the machine's time zone.
const now = new Date(2026, 2, 10, 8, 20);
const slot = (id: string, slotTime: string, enabled = true) => ({ id, slotTime, amountMl: 200, enabled });

describe("dueWaterSlots", () => {
  it("keeps slots that started within the last 30 minutes", () => {
    const due = dueWaterSlots([slot("a", "07:45"), slot("b", "08:00"), slot("c", "08:20"), slot("d", "08:30")], [], now);
    expect(due.map((s) => s.id)).toEqual(["b", "c"]);
  });

  it("skips disabled or malformed slots", () => {
    expect(dueWaterSlots([slot("a", "08:10", false), slot("b", "xx")], [], now)).toEqual([]);
  });

  it("skips a slot when the user already drank during that hour today, but not on another day", () => {
    const logs = [{ loggedAt: new Date(2026, 2, 10, 8, 5) }, { loggedAt: new Date(2026, 2, 9, 7, 55) }];
    expect(dueWaterSlots([slot("a", "08:10")], logs, now)).toEqual([]);
    expect(dueWaterSlots([slot("b", "07:55")], logs, new Date(2026, 2, 10, 8, 0)).map((s) => s.id)).toEqual(["b"]);
  });
});
