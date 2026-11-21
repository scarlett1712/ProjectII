import { describe, expect, it } from "vitest";
import {
  addAppMonths,
  appDayKey,
  appMonthRange,
  appYearMonth,
  appYearRange,
  fromDateInputValue,
  startOfAppDay,
  toDateInputValue,
  toDateTimeLocalValue,
  withAppOffset,
} from "./time";

describe("app time zone (UTC+7) helpers", () => {
  it("starts the day at 00:00 Vietnam time", () => {
    // 2026-03-01 05:00 VN = 2026-02-28 22:00 UTC
    expect(startOfAppDay(new Date("2026-02-28T22:00:00Z")).toISOString()).toBe("2026-02-28T17:00:00.000Z");
  });

  it("builds month and year ranges on Vietnam midnight", () => {
    expect(appMonthRange(2026, 3)).toEqual({
      start: new Date("2026-02-28T17:00:00Z"),
      end: new Date("2026-03-31T17:00:00Z"),
    });
    expect(appMonthRange(2026, 12).end).toEqual(new Date("2026-12-31T17:00:00Z"));
    expect(appYearRange(2026).start).toEqual(new Date("2025-12-31T17:00:00Z"));
  });

  it("reads the Vietnam year/month and day key, not the UTC one", () => {
    const earlyFirstOfMonth = new Date("2026-02-28T20:00:00Z"); // 03:00 on March 1 in Vietnam.
    expect(appYearMonth(earlyFirstOfMonth)).toEqual({ year: 2026, month: 3 });
    expect(appDayKey(earlyFirstOfMonth)).toBe("2026-03-01");
  });

  it("adds months on the Vietnam calendar, keeping wall-clock time and clamping the day", () => {
    // 05:00 on March 1 in Vietnam becomes 05:00 on April 1. UTC month arithmetic would give March 29.
    expect(addAppMonths(new Date("2026-02-28T22:00:00Z"), 1).toISOString()).toBe("2026-03-31T22:00:00.000Z");
    // 31/1 → 28/2
    expect(appDayKey(addAppMonths(new Date("2026-01-31T03:00:00Z"), 1))).toBe("2026-02-28");
    expect(appDayKey(addAppMonths(new Date("2026-03-15T03:00:00Z"), -3))).toBe("2025-12-15");
  });

  it("adds +07:00 only to datetimes without a timezone", () => {
    expect(withAppOffset("2026-11-15T08:00:00")).toBe("2026-11-15T08:00:00+07:00");
    expect(withAppOffset("2026-11-15T08:00:00Z")).toBe("2026-11-15T08:00:00Z");
    expect(withAppOffset("2026-11-15T08:00:00-0500")).toBe("2026-11-15T08:00:00-0500");
    expect(withAppOffset("not a date")).toBe("not a date");
    expect(withAppOffset(undefined)).toBeUndefined();
  });
});

describe("local input helpers", () => {
  const local = new Date(2026, 2, 1, 5, 7);

  it("formats date and datetime-local values in local time", () => {
    expect(toDateInputValue(local)).toBe("2026-03-01");
    expect(toDateTimeLocalValue(local)).toBe("2026-03-01T05:07");
  });

  it("parses a date input keeping the time of an existing value", () => {
    expect(fromDateInputValue("2026-03-05", local)).toEqual(new Date(2026, 2, 5, 5, 7));
    expect(fromDateInputValue("2026-03-05")).toEqual(new Date(2026, 2, 5));
  });
});
