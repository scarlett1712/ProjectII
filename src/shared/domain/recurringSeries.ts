import { INSTANCE_SEPARATOR, defaultOpenEndLimit, getNextRecurrenceDate, type RecurrenceType } from "./recurrence";

/**
 * Pure planning logic for edits and deletions of recurring tasks and calendar events.
 *
 * Clients address each occurrence as <seriesId>_rec_<timestamp in milliseconds>.
 * The plan functions describe changes. Each feature maps the plan to database writes.
 */

export type SeriesMode = "one" | "future" | "all";

/** End the original series one second before the detached occurrence. */
const SPLIT_OFFSET_MS = 1000;

export interface InstanceRef {
  /** Original series record ID. */
  seriesId: string;
  /** Whether the ID contains _rec_ and refers to a specific occurrence. */
  isInstance: boolean;
  /** Occurrence timestamp. Null for plain IDs and possibly NaN for malformed IDs. */
  instanceTimestamp: number | null;
}

export function parseInstanceId(id: string): InstanceRef {
  if (!id.includes(INSTANCE_SEPARATOR)) {
    return { seriesId: id, isInstance: false, instanceTimestamp: null };
  }
  const parts = id.split(INSTANCE_SEPARATOR);
  return { seriesId: parts[0], isInstance: true, instanceTimestamp: parseInt(parts[1], 10) };
}

/**
 * Read the occurrence start from its _rec_ ID or use the first occurrence when given the original series ID.
 * Return null when the ID contains an invalid timestamp.
 */
export function resolveInstanceStart(ref: InstanceRef, seriesStart: Date): Date | null {
  if (ref.instanceTimestamp === null) return new Date(seriesStart);
  return Number.isNaN(ref.instanceTimestamp) ? null : new Date(ref.instanceTimestamp);
}

export function isRecurringRule(recurrence: RecurrenceType): boolean {
  return Boolean(recurrence && recurrence !== "NONE");
}

/**
 * Normalize the requested mode. Use fallback for empty input and unknownAs for unrecognized values.
 * The caller selects the unknown-mode behavior for each endpoint.
 */
export function resolveSeriesMode(requested: unknown, fallback: SeriesMode, unknownAs: SeriesMode): SeriesMode {
  if (!requested) return fallback;
  return requested === "one" || requested === "future" || requested === "all" ? requested : unknownAs;
}

export interface SeriesSnapshot {
  /** First occurrence of the series: dueAt or createdAt for tasks, startAt for events. */
  start: Date;
  recurrence: RecurrenceType;
  recurrenceEnd: Date | null;
}

export interface TruncateParentPlan {
  kind: "truncateParent";
  /** Updated recurrenceEnd of the original series, one second before the occurrence. */
  recurrenceEnd: Date;
  /** Start of a continuation series retaining the old fields, or null if no later occurrence remains. */
  continuationStart: Date | null;
}

export type DetachPlan =
  | { kind: "deleteParent" }
  | { kind: "shiftParent"; nextStart: Date }
  | TruncateParentPlan;

export interface DetachOptions {
  /**
   * Substitute for a missing recurrenceEnd when splitting after the first occurrence.
   * Null always permits a continuation series.
   */
  openEndLimit: Date | null;
}

/** Remove exactly one occurrence when editing or deleting in "one" mode. */
export function planDetachOccurrence(
  series: SeriesSnapshot,
  instanceStart: Date,
  { openEndLimit }: DetachOptions,
): DetachPlan {
  const nextStart = new Date(getNextRecurrenceDate(instanceStart, series.recurrence));

  if (isFirstOccurrence(series, instanceStart)) {
    if (series.recurrenceEnd && nextStart > series.recurrenceEnd) return { kind: "deleteParent" };
    return { kind: "shiftParent", nextStart };
  }

  const limit = series.recurrenceEnd ?? openEndLimit;
  return {
    kind: "truncateParent",
    recurrenceEnd: endBefore(instanceStart),
    continuationStart: !limit || nextStart <= limit ? nextStart : null,
  };
}

/** Delete this and subsequent occurrences in "future" mode. */
export function planRemoveFrom(
  series: SeriesSnapshot,
  instanceStart: Date,
): { kind: "deleteParent" } | TruncateParentPlan {
  if (isFirstOccurrence(series, instanceStart)) return { kind: "deleteParent" };
  return { kind: "truncateParent", recurrenceEnd: endBefore(instanceStart), continuationStart: null };
}

/**
 * For a "future" edit at the first occurrence, update the original record directly.
 * Otherwise truncate the original series and let the caller create a new series using the edited fields.
 */
export function planEditFrom(
  series: SeriesSnapshot,
  instanceStart: Date,
): { kind: "updateParent" } | TruncateParentPlan {
  if (isFirstOccurrence(series, instanceStart)) return { kind: "updateParent" };
  return { kind: "truncateParent", recurrenceEnd: endBefore(instanceStart), continuationStart: null };
}

function isFirstOccurrence(series: SeriesSnapshot, instanceStart: Date): boolean {
  return instanceStart.getTime() === series.start.getTime();
}

function endBefore(instanceStart: Date): Date {
  return new Date(instanceStart.getTime() - SPLIT_OFFSET_MS);
}

/* ------------------------------------------------------------------------------------------------
 * Recurring tasks and calendar events share the same edit and delete flow. Each feature supplies
 * a SeriesAdapter describing its timestamp fields: dueAt for tasks and startAt/endAt for events.
 * ---------------------------------------------------------------------------------------------- */

/** Series write operation. Operations ending in Parent always target the original record. */
export type SeriesWrite<F> =
  | { op: "deleteParent" }
  | { op: "updateParent"; data: Partial<F> }
  | { op: "create"; data: F };

/** An undefined field was omitted and retains its value. An explicit null clears it. */
export function keep<T>(value: T | undefined, fallback: T): T {
  return value !== undefined ? value : fallback;
}

/** Merge the specified keys with the client patch, overriding only supplied fields. */
export function mergeFields<T, K extends keyof T>(item: T, patch: Partial<Pick<T, K>>, keys: readonly K[]): Pick<T, K> {
  const merged = {} as Pick<T, K>;
  for (const key of keys) merged[key] = keep(patch[key], item[key]) as T[K];
  return merged;
}

/**
 * In "all" mode, update only supplied fields. Omitted fields, including recurrenceEnd,
 * retain their old values. Earlier calendar edits cleared an omitted recurrenceEnd.
 */
export function sentFields<P extends object>(patch: P): Partial<P> {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<P>;
}

/** Series fields shared by recurring tasks and events. */
export interface SeriesFields {
  recurrence: string | null;
  recurrenceEnd: Date | null;
}

export interface SeriesAdapter<T, F extends SeriesFields, P> {
  snapshot(item: T): SeriesSnapshot;
  /** Time fields when moving the original record to the occurrence at start (shiftParent plan). */
  shiftTo(item: T, start: Date): Partial<F>;
  /** Continuation series starting at start and retaining the original series fields. */
  continueAt(item: T, start: Date): F;
  /** A singly edited occurrence ("one" mode) becomes an independent, nonrecurring record. */
  detached(item: T, patch: P, instanceStart: Date): F;
  /**
   * Series fields after a "future" edit. splitting is false for an in-place edit of the first occurrence
   * and true for a new series beginning at instanceStart.
   */
  edited(item: T, patch: P, instanceStart: Date, splitting: boolean): F;
}

/** Map a series split plan to write operations. */
export function writesForPlan<T, F extends SeriesFields, P>(
  adapter: SeriesAdapter<T, F, P>,
  item: T,
  plan: DetachPlan | TruncateParentPlan,
): SeriesWrite<F>[] {
  switch (plan.kind) {
    case "deleteParent":
      return [{ op: "deleteParent" }];
    case "shiftParent":
      return [{ op: "updateParent", data: adapter.shiftTo(item, plan.nextStart) }];
    case "truncateParent": {
      const truncate: Partial<SeriesFields> = { recurrenceEnd: plan.recurrenceEnd };
      const writes: SeriesWrite<F>[] = [{ op: "updateParent", data: truncate as Partial<F> }];
      if (plan.continuationStart) writes.push({ op: "create", data: adapter.continueAt(item, plan.continuationStart) });
      return writes;
    }
  }
}

/** Result of an edit or delete request. The use case maps it to feature-specific repository calls or an HTTP error. */
export type SeriesAction<F> =
  /** Edit the original record using the supplied fields, or delete that record on a delete request. */
  | { kind: "wholeRecord" }
  | { kind: "writes"; writes: SeriesWrite<F>[] }
  /** Occurrence ID with a malformed timestamp. */
  | { kind: "invalidId" }
  | { kind: "notFound" };

/**
 * Plan a series edit using the normalized mode. For nonrecurring records and "all" mode, always edit the
 * original record identified by seriesIdOf(id). In "one" mode, cap an open-ended continuation series with
 * defaultOpenEndLimit, as when deleting a single occurrence.
 */
export function planSeriesUpdate<T, F extends SeriesFields, P>(
  adapter: SeriesAdapter<T, F, P>,
  item: T,
  ref: InstanceRef,
  patch: P,
  mode: SeriesMode,
): SeriesAction<F> {
  const series = adapter.snapshot(item);
  if (mode === "all" || !(ref.isInstance || isRecurringRule(series.recurrence))) return { kind: "wholeRecord" };

  const instanceStart = resolveInstanceStart(ref, series.start);
  if (!instanceStart) return { kind: "invalidId" };

  if (mode === "one") {
    const plan = planDetachOccurrence(series, instanceStart, { openEndLimit: defaultOpenEndLimit() });
    return {
      kind: "writes",
      writes: [...writesForPlan(adapter, item, plan), { op: "create", data: adapter.detached(item, patch, instanceStart) }],
    };
  }

  const plan = planEditFrom(series, instanceStart);
  if (plan.kind === "updateParent") {
    return { kind: "writes", writes: [{ op: "updateParent", data: adapter.edited(item, patch, instanceStart, false) }] };
  }
  return {
    kind: "writes",
    writes: [...writesForPlan(adapter, item, plan), { op: "create", data: adapter.edited(item, patch, instanceStart, true) }],
  };
}

/**
 * Default to "one" for an occurrence ID and "all" for an original record ID.
 * Unknown values, normally rejected by seriesModeSchema, fall back to the default for the ID type.
 */
export function resolveDeleteMode(ref: InstanceRef, requested: unknown): SeriesMode {
  const fallback: SeriesMode = ref.isInstance ? "one" : "all";
  return resolveSeriesMode(requested, fallback, fallback);
}

/**
 * Delete by mode. "all" deletes ref.seriesId directly without a prior lookup (item is null).
 * An original ID for a nonrecurring or missing record deletes the whole record without raising an error.
 */
export function planSeriesDelete<T, F extends SeriesFields, P>(
  adapter: SeriesAdapter<T, F, P>,
  item: T | null,
  ref: InstanceRef,
  mode: SeriesMode,
): SeriesAction<F> {
  if (mode === "all") return { kind: "wholeRecord" };
  if (!ref.isInstance && (!item || !isRecurringRule(adapter.snapshot(item).recurrence))) return { kind: "wholeRecord" };
  if (!item) return { kind: "notFound" };

  const series = adapter.snapshot(item);
  const instanceStart = resolveInstanceStart(ref, series.start);
  if (!instanceStart) return { kind: "invalidId" };

  const plan =
    mode === "future"
      ? planRemoveFrom(series, instanceStart)
      : planDetachOccurrence(series, instanceStart, { openEndLimit: defaultOpenEndLimit() });
  return { kind: "writes", writes: writesForPlan(adapter, item, plan) };
}
