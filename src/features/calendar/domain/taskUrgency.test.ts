import { describe, expect, it } from "vitest";
import { taskUrgency } from "./taskUrgency";

const now = new Date("2026-01-01T12:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();

describe("taskUrgency", () => {
  it("returns null without a deadline", () => {
    expect(taskUrgency(null, now)).toBeNull();
    expect(taskUrgency("", now)).toBeNull();
  });

  it("is critical when overdue or due within 2 hours", () => {
    expect(taskUrgency(inHours(-5), now)).toBe("critical");
    expect(taskUrgency(inHours(1.9), now)).toBe("critical");
  });

  it("is warning when due within 24 hours", () => {
    expect(taskUrgency(inHours(2), now)).toBe("warning");
    expect(taskUrgency(inHours(23.9), now)).toBe("warning");
  });

  it("is normal from 24 hours on", () => {
    expect(taskUrgency(inHours(24), now)).toBe("normal");
  });
});
