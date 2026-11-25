import { describe, expect, it } from "vitest";
import { formatShortCurrencyTag, isValidDateKey, isValidMonthKey, toLocalDateKey } from "./diaryDate";

describe("diaryDate", () => {
  it("validates date and month keys", () => {
    expect(isValidDateKey("2026-11-25")).toBe(true);
    expect(isValidDateKey("2026-11")).toBe(false);
    expect(isValidMonthKey("2026-11")).toBe(true);
    expect(isValidMonthKey("2026-11-25")).toBe(false);
  });

  it("formats local date key", () => {
    expect(toLocalDateKey(new Date(2026, 10, 5, 14, 30))).toBe("2026-11-05");
  });

  it("formats compact currency tags for photo badges", () => {
    expect(formatShortCurrencyTag(50000, "EXPENSE")).toBe("-50k");
    expect(formatShortCurrencyTag(1250000, "INCOME")).toBe("+1.3tr");
    expect(formatShortCurrencyTag(2000000, "INCOME")).toBe("+2tr");
    expect(formatShortCurrencyTag(500, "EXPENSE")).toBe("-500đ");
  });
});
