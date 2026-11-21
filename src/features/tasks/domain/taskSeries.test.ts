import { describe, expect, it } from "vitest";
import { sentFields, writesForPlan } from "@/shared/domain/recurringSeries";
import {
  defaultTaskEditMode,
  detachedTaskFields,
  editedSeriesFields,
  taskSeries,
  taskSeriesSnapshot,
  type Task,
} from "./taskSeries";

const DUE = new Date(2026, 0, 1, 9, 0);
const task: Task = {
  id: "t1",
  title: "Uống thuốc",
  description: "sau ăn",
  dueAt: DUE,
  createdAt: new Date(2025, 11, 1),
  completed: false,
  tagId: "tag1",
  color: "#fff",
  notification: true,
  noteColor: "#000",
  recurrence: "DAILY",
  recurrenceEnd: null,
};

describe("taskSeriesSnapshot", () => {
  it("starts at dueAt, or createdAt when there is no due date", () => {
    expect(taskSeriesSnapshot(task).start).toEqual(DUE);
    expect(taskSeriesSnapshot({ ...task, dueAt: null }).start).toEqual(task.createdAt);
  });
});

describe("defaultTaskEditMode", () => {
  it("edits one occurrence for instance ids", () => {
    expect(defaultTaskEditMode({ isInstance: true, isRecurring: true, completing: false })).toBe("one");
  });

  it("completes only one occurrence of a recurring task", () => {
    expect(defaultTaskEditMode({ isInstance: false, isRecurring: true, completing: true })).toBe("one");
  });

  it("edits everything otherwise", () => {
    expect(defaultTaskEditMode({ isInstance: false, isRecurring: true, completing: false })).toBe("all");
    expect(defaultTaskEditMode({ isInstance: false, isRecurring: false, completing: true })).toBe("all");
  });
});

describe("writesForPlan(taskSeries)", () => {
  it("maps delete / shift", () => {
    expect(writesForPlan(taskSeries, task, { kind: "deleteParent" })).toEqual([{ op: "deleteParent" }]);
    const next = new Date(2026, 0, 2, 9, 0);
    expect(writesForPlan(taskSeries, task, { kind: "shiftParent", nextStart: next })).toEqual([
      { op: "updateParent", data: { dueAt: next } },
    ]);
  });

  it("truncates and copies the original series as continuation", () => {
    const end = new Date(2026, 0, 4);
    const next = new Date(2026, 0, 6, 9, 0);
    const writes = writesForPlan(taskSeries, task, { kind: "truncateParent", recurrenceEnd: end, continuationStart: next });
    expect(writes).toEqual([
      { op: "updateParent", data: { recurrenceEnd: end } },
      {
        op: "create",
        data: {
          title: task.title,
          description: task.description,
          dueAt: next,
          tagId: task.tagId,
          color: task.color,
          notification: task.notification,
          noteColor: task.noteColor,
          recurrence: "DAILY",
          recurrenceEnd: null,
        },
      },
    ]);
  });

  it("only truncates when there is no continuation", () => {
    const end = new Date(2026, 0, 4);
    expect(writesForPlan(taskSeries, task, { kind: "truncateParent", recurrenceEnd: end, continuationStart: null })).toHaveLength(1);
  });
});

describe("detachedTaskFields", () => {
  const instance = new Date(2026, 0, 5, 9, 0);

  it("creates a non-recurring, not-completed copy at the instance", () => {
    expect(detachedTaskFields(task, {}, instance)).toEqual({
      title: task.title,
      description: task.description,
      dueAt: instance,
      completed: false,
      tagId: task.tagId,
      color: task.color,
      notification: true,
      noteColor: task.noteColor,
      recurrence: "NONE",
      recurrenceEnd: null,
    });
  });

  it("keeps no due date for tasks without one, and applies overrides including null", () => {
    expect(detachedTaskFields({ ...task, dueAt: null }, {}, instance).dueAt).toBeNull();
    const fields = detachedTaskFields(task, { completed: true, dueAt: null, description: null, tagId: null }, instance);
    expect(fields).toMatchObject({ completed: true, dueAt: null, description: null, tagId: null });
  });
});

describe("editedSeriesFields", () => {
  it("applies recurrence overrides and uses the given dueAt", () => {
    const due = new Date(2026, 0, 9);
    const end = new Date(2026, 1, 1);
    expect(editedSeriesFields(task, { title: "Mới", recurrence: "WEEKLY", recurrenceEnd: end }, due)).toMatchObject({
      title: "Mới",
      dueAt: due,
      recurrence: "WEEKLY",
      recurrenceEnd: end,
    });
    expect(editedSeriesFields(task, {}, due)).not.toHaveProperty("completed");
  });
});

describe("sentFields (mode all)", () => {
  it("keeps only provided fields", () => {
    expect(sentFields({ title: "x", tagId: null, completed: true })).toEqual({ title: "x", tagId: null, completed: true });
    expect(sentFields({})).toEqual({});
  });
});

describe("taskSeries.edited", () => {
  const later = new Date(2026, 0, 5, 9, 0);

  it("keeps the old dueAt (even null) when editing the parent in place", () => {
    expect(taskSeries.edited(task, {}, DUE, false).dueAt).toEqual(DUE);
    expect(taskSeries.edited({ ...task, dueAt: null }, {}, task.createdAt, false).dueAt).toBeNull();
  });

  it("starts the split series at the instance unless a new dueAt is sent", () => {
    expect(taskSeries.edited(task, {}, later, true).dueAt).toEqual(later);
    const sent = new Date(2026, 0, 6, 7, 0);
    expect(taskSeries.edited(task, { dueAt: sent }, later, true).dueAt).toEqual(sent);
  });
});
