import { describe, expect, it } from "vitest";
import { HOUR_ROW_PX, dayColumnHeight, hourLabel, visibleHours } from "./timeGrid";

describe("timeGrid", () => {
  it("lists the visible hours", () => {
    expect(visibleHours([])).toHaveLength(24);
    expect(visibleHours([0, 1, 23])).toEqual(Array.from({ length: 21 }, (_, i) => i + 2));
  });

  it("shrinks the column by hidden hours", () => {
    expect(dayColumnHeight([])).toBe(24 * HOUR_ROW_PX);
    expect(dayColumnHeight([3, 4])).toBe(22 * HOUR_ROW_PX);
  });

  it("formats hour labels", () => {
    expect(hourLabel(7)).toBe("07:00");
    expect(hourLabel(18)).toBe("18:00");
  });
});
