import { describe, expect, it } from "vitest";
import {
  isRecurringRule,
  keep,
  mergeFields,
  parseInstanceId,
  planDetachOccurrence,
  planEditFrom,
  planRemoveFrom,
  planSeriesDelete,
  planSeriesUpdate,
  resolveDeleteMode,
  resolveInstanceStart,
  resolveSeriesMode,
  sentFields,
  writesForPlan,
  type SeriesAdapter,
  type SeriesSnapshot,
} from "./recurringSeries";

const START = new Date(2026, 0, 1, 9, 0);
const day = (n: number) => new Date(2026, 0, n, 9, 0);
const daily = (recurrenceEnd: Date | null = null): SeriesSnapshot => ({ start: START, recurrence: "DAILY", recurrenceEnd });

describe("parseInstanceId", () => {
  it("returns the id itself for a series id", () => {
    expect(parseInstanceId("abc")).toEqual({ seriesId: "abc", isInstance: false, instanceTimestamp: null });
  });

  it("splits `<id>_rec_<timestamp>`", () => {
    expect(parseInstanceId(`abc_rec_${START.getTime()}`)).toEqual({
      seriesId: "abc",
      isInstance: true,
      instanceTimestamp: START.getTime(),
    });
  });

  it("keeps NaN for a malformed timestamp", () => {
    expect(parseInstanceId("abc_rec_xyz").instanceTimestamp).toBeNaN();
  });
});

describe("resolveInstanceStart", () => {
  it("uses the series start for a series id", () => {
    expect(resolveInstanceStart(parseInstanceId("abc"), START)).toEqual(START);
  });

  it("uses the timestamp of an instance id", () => {
    expect(resolveInstanceStart(parseInstanceId(`abc_rec_${day(3).getTime()}`), START)).toEqual(day(3));
  });

  it("returns null for a malformed instance id", () => {
    expect(resolveInstanceStart(parseInstanceId("abc_rec_"), START)).toBeNull();
  });
});

describe("isRecurringRule", () => {
  it.each([
    ["DAILY", true],
    ["WEEKLY", true],
    ["NONE", false],
    [null, false],
    ["", false],
  ])("%s → %s", (rule, expected) => {
    expect(isRecurringRule(rule)).toBe(expected);
  });
});

describe("resolveSeriesMode", () => {
  it("uses the fallback when nothing was requested", () => {
    expect(resolveSeriesMode(null, "one", "all")).toBe("one");
    expect(resolveSeriesMode("", "all", "one")).toBe("all");
    expect(resolveSeriesMode(undefined, "future", "all")).toBe("future");
  });

  it("passes known modes through", () => {
    expect(resolveSeriesMode("one", "all", "all")).toBe("one");
    expect(resolveSeriesMode("future", "all", "all")).toBe("future");
    expect(resolveSeriesMode("all", "one", "one")).toBe("all");
  });

  it("maps unknown modes to `unknownAs`", () => {
    expect(resolveSeriesMode("weird", "one", "all")).toBe("all");
    expect(resolveSeriesMode("weird", "all", "one")).toBe("one");
  });
});

describe("planDetachOccurrence", () => {
  describe("first occurrence", () => {
    it("shifts the parent to the next occurrence", () => {
      expect(planDetachOccurrence(daily(), START, { openEndLimit: null })).toEqual({
        kind: "shiftParent",
        nextStart: day(2),
      });
    });

    it("shifts by week / month", () => {
      const weekly = { ...daily(), recurrence: "WEEKLY" };
      const monthly = { ...daily(), recurrence: "MONTHLY" };
      expect(planDetachOccurrence(weekly, START, { openEndLimit: null })).toEqual({ kind: "shiftParent", nextStart: day(8) });
      expect(planDetachOccurrence(monthly, START, { openEndLimit: null })).toEqual({
        kind: "shiftParent",
        nextStart: new Date(2026, 1, 1, 9, 0),
      });
    });

    it("deletes the parent when no occurrence remains before recurrenceEnd", () => {
      expect(planDetachOccurrence(daily(day(1)), START, { openEndLimit: null })).toEqual({ kind: "deleteParent" });
    });

    it("still shifts when the next occurrence is exactly recurrenceEnd", () => {
      expect(planDetachOccurrence(daily(day(2)), START, { openEndLimit: null }).kind).toBe("shiftParent");
    });

    it("ignores openEndLimit for the first occurrence", () => {
      expect(planDetachOccurrence(daily(), START, { openEndLimit: day(1) }).kind).toBe("shiftParent");
    });
  });

  describe("later occurrence", () => {
    it("truncates 1s before the instance and continues the next day", () => {
      expect(planDetachOccurrence(daily(), day(5), { openEndLimit: null })).toEqual({
        kind: "truncateParent",
        recurrenceEnd: new Date(day(5).getTime() - 1000),
        continuationStart: day(6),
      });
    });

    it("does not continue past recurrenceEnd", () => {
      const plan = planDetachOccurrence(daily(day(5)), day(5), { openEndLimit: null });
      expect(plan).toMatchObject({ kind: "truncateParent", continuationStart: null });
    });

    it("continues when the next occurrence is exactly recurrenceEnd", () => {
      const plan = planDetachOccurrence(daily(day(6)), day(5), { openEndLimit: null });
      expect(plan).toMatchObject({ continuationStart: day(6) });
    });

    it("uses openEndLimit only when the series has no recurrenceEnd", () => {
      expect(planDetachOccurrence(daily(), day(5), { openEndLimit: day(5) })).toMatchObject({ continuationStart: null });
      expect(planDetachOccurrence(daily(), day(5), { openEndLimit: day(6) })).toMatchObject({ continuationStart: day(6) });
      expect(planDetachOccurrence(daily(day(10)), day(5), { openEndLimit: day(1) })).toMatchObject({
        continuationStart: day(6),
      });
    });
  });
});

describe("planRemoveFrom", () => {
  it("deletes the whole series from the first occurrence", () => {
    expect(planRemoveFrom(daily(), START)).toEqual({ kind: "deleteParent" });
  });

  it("truncates 1s before a later occurrence without continuation", () => {
    expect(planRemoveFrom(daily(), day(4))).toEqual({
      kind: "truncateParent",
      recurrenceEnd: new Date(day(4).getTime() - 1000),
      continuationStart: null,
    });
  });
});

describe("planEditFrom", () => {
  it("edits the parent in place from the first occurrence", () => {
    expect(planEditFrom(daily(), START)).toEqual({ kind: "updateParent" });
  });

  it("truncates before a later occurrence", () => {
    expect(planEditFrom(daily(), day(4))).toEqual({
      kind: "truncateParent",
      recurrenceEnd: new Date(day(4).getTime() - 1000),
      continuationStart: null,
    });
  });
});

describe("keep / mergeFields / sentFields", () => {
  it("treats only undefined as not sent", () => {
    expect(keep(undefined, "a")).toBe("a");
    expect(keep(null, "a")).toBeNull();
    expect(keep("", "a")).toBe("");
  });

  it("merges the listed keys only", () => {
    const item = { a: 1, b: "x", c: true };
    expect(mergeFields(item, { a: undefined, b: "y" }, ["a", "b"] as const)).toEqual({ a: 1, b: "y" });
  });

  it("drops unsent fields so mode all never clears them", () => {
    expect(sentFields({ a: 1, b: undefined, c: null })).toEqual({ a: 1, c: null });
  });
});

/** Minimal adapter with a timestamp (at) and name for exercising shared series behavior. */
interface Item {
  at: Date;
  name: string;
  recurrence: string | null;
  recurrenceEnd: Date | null;
}
type Patch = Partial<Item>;
const adapter: SeriesAdapter<Item, Item, Patch> = {
  snapshot: (i) => ({ start: i.at, recurrence: i.recurrence, recurrenceEnd: i.recurrenceEnd }),
  shiftTo: (_, at) => ({ at }),
  continueAt: (i, at) => ({ ...i, at }),
  detached: (i, p, at) => ({ ...i, ...p, at: p.at ?? at, recurrence: "NONE", recurrenceEnd: null }),
  edited: (i, p, at) => ({ ...i, ...p, at: p.at ?? at }),
};
const item: Item = { at: START, name: "a", recurrence: "DAILY", recurrenceEnd: null };
const ref = (id: string) => parseInstanceId(id);
const inst = (d: Date) => `s1_rec_${d.getTime()}`;
const endBefore = (d: Date) => new Date(d.getTime() - 1000);

describe("writesForPlan", () => {
  it("maps each plan kind to writes on the parent", () => {
    expect(writesForPlan(adapter, item, { kind: "deleteParent" })).toEqual([{ op: "deleteParent" }]);
    expect(writesForPlan(adapter, item, { kind: "shiftParent", nextStart: day(2) })).toEqual([
      { op: "updateParent", data: { at: day(2) } },
    ]);
    expect(
      writesForPlan(adapter, item, { kind: "truncateParent", recurrenceEnd: endBefore(day(3)), continuationStart: day(4) }),
    ).toEqual([
      { op: "updateParent", data: { recurrenceEnd: endBefore(day(3)) } },
      { op: "create", data: { ...item, at: day(4) } },
    ]);
  });
});

describe("planSeriesUpdate", () => {
  it("updates the whole record for mode all or a non-recurring item", () => {
    expect(planSeriesUpdate(adapter, item, ref(inst(day(3))), {}, "all")).toEqual({ kind: "wholeRecord" });
    expect(planSeriesUpdate(adapter, { ...item, recurrence: "NONE" }, ref("s1"), {}, "one")).toEqual({ kind: "wholeRecord" });
  });

  it("reports a malformed instance id", () => {
    expect(planSeriesUpdate(adapter, item, ref("s1_rec_x"), {}, "one")).toEqual({ kind: "invalidId" });
  });

  it("mode one detaches the occurrence and limits an open-ended continuation to defaultOpenEndLimit", () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 3600 * 1000);
    const series = { ...item, at: new Date(now.getTime() - 24 * 3600 * 1000) };
    // A next occurrence within six months produces a continuation series.
    const action = planSeriesUpdate(adapter, series, ref(inst(soon)), { name: "b" }, "one");
    expect(action.kind === "writes" && action.writes.map((w) => w.op)).toEqual(["updateParent", "create", "create"]);
    // No continuation when the next occurrence falls beyond the horizon.
    const far = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    const late = planSeriesUpdate(adapter, series, ref(inst(far)), { name: "b" }, "one");
    expect(late.kind === "writes" && late.writes.map((w) => w.op)).toEqual(["updateParent", "create"]);
  });

  it("mode future edits in place from the first occurrence, splits from a later one", () => {
    expect(planSeriesUpdate(adapter, item, ref(inst(START)), { name: "b" }, "future")).toEqual({
      kind: "writes",
      writes: [{ op: "updateParent", data: { ...item, name: "b" } }],
    });
    expect(planSeriesUpdate(adapter, item, ref(inst(day(3))), { name: "b" }, "future")).toEqual({
      kind: "writes",
      writes: [
        { op: "updateParent", data: { recurrenceEnd: endBefore(day(3)) } },
        { op: "create", data: { ...item, name: "b", at: day(3) } },
      ],
    });
  });
});

describe("resolveDeleteMode", () => {
  it("defaults an instance id to one and a series id to all", () => {
    expect(resolveDeleteMode(ref(inst(day(3))), undefined)).toBe("one");
    expect(resolveDeleteMode(ref(inst(day(3))), "weird")).toBe("one");
    expect(resolveDeleteMode(ref("s1"), null)).toBe("all");
    expect(resolveDeleteMode(ref("s1"), "future")).toBe("future");
  });
});

describe("planSeriesDelete", () => {
  it("mode all deletes the whole record without needing the item", () => {
    expect(planSeriesDelete(adapter, null, ref(inst(day(3))), "all")).toEqual({ kind: "wholeRecord" });
  });

  it("a series id of a missing or non-recurring item deletes the record", () => {
    expect(planSeriesDelete(adapter, null, ref("s1"), "one")).toEqual({ kind: "wholeRecord" });
    expect(planSeriesDelete(adapter, { ...item, recurrence: "NONE" }, ref("s1"), "one")).toEqual({ kind: "wholeRecord" });
  });

  it("an instance of a missing series is not found; a malformed one is invalid", () => {
    expect(planSeriesDelete(adapter, null, ref(inst(day(3))), "one")).toEqual({ kind: "notFound" });
    expect(planSeriesDelete(adapter, item, ref("s1_rec_x"), "one")).toEqual({ kind: "invalidId" });
  });

  it("mode one removes one occurrence, mode future truncates", () => {
    expect(planSeriesDelete(adapter, item, ref("s1"), "one")).toEqual({
      kind: "writes",
      writes: [{ op: "updateParent", data: { at: day(2) } }],
    });
    expect(planSeriesDelete(adapter, item, ref(inst(day(3))), "future")).toEqual({
      kind: "writes",
      writes: [{ op: "updateParent", data: { recurrenceEnd: endBefore(day(3)) } }],
    });
  });
});
