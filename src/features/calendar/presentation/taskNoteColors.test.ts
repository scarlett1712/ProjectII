import { describe, expect, it } from "vitest";
import { colors } from "@/shared/theme/tokens";
import {
  calendarTaskBackground,
  contrastTextColor,
  customNoteColor,
  dashboardTaskBackground,
  taskStatusDotClass,
} from "./taskNoteColors";

const now = new Date("2026-01-01T12:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();

describe("customNoteColor", () => {
  it("ignores the default yellows (case-insensitive)", () => {
    expect(customNoteColor("#FDFD96")).toBeUndefined();
    expect(customNoteColor(null)).toBeUndefined();
    expect(customNoteColor("#123456")).toBe("#123456");
  });
});

describe("contrastTextColor", () => {
  it("falls back to strong ink without a colour", () => {
    expect(contrastTextColor("")).toBe(colors.inkStrong);
  });

  it("darkens the background colour", () => {
    expect(contrastTextColor("#808080")).toBe("#4c4c4c");
  });
});

describe("calendarTaskBackground", () => {
  it("prefers the custom colour even when completed", () => {
    expect(calendarTaskBackground({ noteColor: "#123456", completed: true })).toBe("#123456");
  });

  it("is grey when completed and yellow otherwise", () => {
    expect(calendarTaskBackground({ completed: true })).toBe(colors.surfaceMuted);
    expect(calendarTaskBackground({ noteColor: "#fdfd96" })).toBe(colors.note);
  });
});

describe("taskStatusDotClass", () => {
  it("maps completion and urgency to a dot colour", () => {
    expect(taskStatusDotClass({ completed: true, dueAt: inHours(1) }, now)).toBe("bg-gray-400");
    expect(taskStatusDotClass({ dueAt: inHours(1) }, now)).toBe("bg-urgency-critical");
    expect(taskStatusDotClass({ dueAt: inHours(5) }, now)).toBe("bg-urgency-warning");
    expect(taskStatusDotClass({ dueAt: null }, now)).toBe("bg-urgency-normal");
  });
});

describe("dashboardTaskBackground", () => {
  it("is grey when completed even with a custom colour", () => {
    expect(dashboardTaskBackground({ completed: true, noteColor: "#123456" }, now)).toBe(colors.surfaceMuted);
  });

  it("uses the custom colour, then yellow without a deadline", () => {
    expect(dashboardTaskBackground({ noteColor: "#123456", dueAt: inHours(1) }, now)).toBe("#123456");
    expect(dashboardTaskBackground({ dueAt: null }, now)).toBe(colors.note);
  });

  it("fills the note by urgency", () => {
    expect(dashboardTaskBackground({ dueAt: inHours(1) }, now)).toBe(colors.urgencyCritical);
    expect(dashboardTaskBackground({ dueAt: inHours(5) }, now)).toBe(colors.urgencyWarning);
    expect(dashboardTaskBackground({ dueAt: inHours(48) }, now)).toBe(colors.urgencyNormal);
  });
});
