import { describe, expect, it } from "vitest";
import { dateRangeQuerySchema, recurrenceField, seriesModeSchema } from "./schemaFields";

describe("seriesModeSchema", () => {
  it("accepts the three scopes and treats empty as not sent", () => {
    expect(seriesModeSchema.parse("one")).toBe("one");
    expect(seriesModeSchema.parse("future")).toBe("future");
    expect(seriesModeSchema.parse("all")).toBe("all");
    expect(seriesModeSchema.parse(null)).toBeUndefined();
    expect(seriesModeSchema.parse("")).toBeUndefined();
  });

  it("rejects a mistyped scope instead of silently editing the whole series", () => {
    expect(() => seriesModeSchema.parse("futur")).toThrow("common.invalidSeriesMode");
  });
});

describe("recurrenceField", () => {
  const schema = recurrenceField("bad");
  it("maps empty to null and rejects unknown rules", () => {
    expect(schema.parse("")).toBeNull();
    expect(schema.parse("WEEKLY")).toBe("WEEKLY");
    expect(() => schema.parse("YEARLY")).toThrow("bad");
  });
});

describe("dateRangeQuerySchema", () => {
  it("accepts up to 400 days and rejects reversed or longer ranges", () => {
    expect(dateRangeQuerySchema.parse({ start: "2026-01-01", end: "2026-12-31" }).end).toEqual(new Date("2026-12-31"));
    expect(dateRangeQuerySchema.parse({ start: null, end: null })).toEqual({ start: undefined, end: undefined });
    expect(() => dateRangeQuerySchema.parse({ start: "2026-02-01", end: "2026-01-01" })).toThrow("common.invalidDateRange");
    expect(() => dateRangeQuerySchema.parse({ start: "2026-01-01", end: "2028-01-01" })).toThrow("common.invalidDateRange");
  });
});
