import type { TaskItem } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/taskRepository", () => ({
  taskRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateAndFind: vi.fn(),
    deleteById: vi.fn(),
    applySeriesWrites: vi.fn(),
  },
}));

import { HttpError } from "@/shared/application/errors";
import { taskRepository } from "../infrastructure/taskRepository";
import { createTaskSchema, updateTaskSchema } from "./taskSchemas";
import { createTask, deleteTask, listTasks, updateTask } from "./taskUseCases";

const NOW = new Date(2026, 0, 1, 0, 0);
const DUE = new Date(2026, 0, 1, 9, 0);
const day = (n: number) => new Date(2026, 0, n, 9, 0);
const instanceId = (d: Date) => `t1_rec_${d.getTime()}`;

const task: TaskItem = {
  id: "t1",
  userId: "u1",
  title: "Chạy bộ",
  description: null,
  dueAt: DUE,
  createdAt: new Date(2025, 11, 1),
  updatedAt: new Date(2025, 11, 1),
  completed: false,
  tagId: null,
  color: null,
  notification: false,
  noteColor: null,
  recurrence: "DAILY",
  recurrenceEnd: null,
};

const writesOf = (call = 0) => vi.mocked(taskRepository.applySeriesWrites).mock.calls[call][2];

describe("task use cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.mocked(taskRepository.findById).mockResolvedValue(task);
  });
  afterEach(() => vi.useRealTimers());

  it("listTasks expands recurring tasks within the window", async () => {
    vi.mocked(taskRepository.findAll).mockResolvedValue([task]);
    const items = await listTasks("u1", { start: day(1), end: day(3) });
    expect(items.map((i) => i.id)).toEqual([instanceId(day(1)), instanceId(day(2)), instanceId(day(3))]);
  });

  it("createTask applies the old defaults", async () => {
    await createTask("u1", createTaskSchema.parse({ title: "A", tagId: "", dueAt: "" }));
    expect(taskRepository.create).toHaveBeenCalledWith("u1", {
      title: "A",
      description: null,
      dueAt: null,
      tagId: null,
      color: null,
      notification: false,
      noteColor: null,
      recurrence: null,
      recurrenceEnd: null,
    });
  });

  describe("updateTask", () => {
    it("404s when the series does not exist", async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(null);
      await expect(updateTask("u1", { id: "nope" })).rejects.toMatchObject({ status: 404, code: "tasks.notFound" });
    });

    it("defaults to completing just one occurrence of a recurring task", async () => {
      await updateTask("u1", updateTaskSchema.parse({ id: "t1", completed: true }));
      expect(writesOf()).toEqual([
        { op: "updateParent", data: { dueAt: day(2) } },
        expect.objectContaining({ op: "create", data: expect.objectContaining({ completed: true, dueAt: DUE, recurrence: "NONE" }) }),
      ]);
    });

    it("mode one on a later occurrence splits off the occurrence and continues the series", async () => {
      await updateTask("u1", { id: instanceId(day(10)), title: "Đổi" });
      const writes = writesOf();
      expect(writes[0]).toEqual({ op: "updateParent", data: { recurrenceEnd: new Date(day(10).getTime() - 1000) } });
      expect(writes[1]).toMatchObject({ op: "create", data: { dueAt: day(11), title: "Chạy bộ", recurrence: "DAILY" } });
      expect(writes[2]).toMatchObject({ op: "create", data: { dueAt: day(10), title: "Đổi", recurrence: "NONE" } });
    });

    it("mode one limits an open-ended continuation to 6 months from now (same as delete and events)", async () => {
      vi.setSystemTime(new Date(2020, 0, 1)); // The next occurrence is more than six months away, so no continuation is created.
      await updateTask("u1", { id: instanceId(day(10)), title: "Đổi" }, "one");
      expect(writesOf().map((w) => w.op)).toEqual(["updateParent", "create"]);
      expect(writesOf()[1]).toMatchObject({ data: { dueAt: day(10), recurrence: "NONE" } });
    });

    it("mode all keeps recurrenceEnd when it is not sent", async () => {
      await updateTask("u1", updateTaskSchema.parse({ id: "t1", title: "E" }), "all");
      expect(taskRepository.updateAndFind).toHaveBeenCalledWith("u1", "t1", { title: "E" });
    });

    it("mode future from the first occurrence updates the parent, keeping dueAt when not sent", async () => {
      await updateTask("u1", { id: instanceId(DUE), title: "B" }, "future");
      expect(writesOf()).toEqual([{ op: "updateParent", data: expect.objectContaining({ title: "B", dueAt: DUE }) }]);
    });

    it("mode future from a later occurrence splits into a new series", async () => {
      await updateTask("u1", { id: instanceId(day(4)), recurrence: "WEEKLY" }, "future");
      expect(writesOf()).toEqual([
        { op: "updateParent", data: { recurrenceEnd: new Date(day(4).getTime() - 1000) } },
        { op: "create", data: expect.objectContaining({ dueAt: day(4), recurrence: "WEEKLY" }) },
      ]);
    });

    it("mode all updates only sent fields of the series id", async () => {
      await updateTask("u1", { id: instanceId(day(4)), title: "C" }, "all");
      expect(taskRepository.updateAndFind).toHaveBeenCalledWith("u1", "t1", { title: "C" });
    });

    it("non-recurring tasks always update in place, even with mode one", async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue({ ...task, recurrence: "NONE" });
      await updateTask("u1", { id: "t1", completed: true }, "one");
      expect(taskRepository.updateAndFind).toHaveBeenCalledWith("u1", "t1", { completed: true });
      expect(taskRepository.applySeriesWrites).not.toHaveBeenCalled();
    });

    it("unknown modes fall back to all", async () => {
      await updateTask("u1", { id: instanceId(day(4)), title: "D" }, "weird");
      expect(taskRepository.updateAndFind).toHaveBeenCalled();
    });

    it("rejects a malformed instance id with 400", async () => {
      await expect(updateTask("u1", { id: "t1_rec_abc" })).rejects.toBeInstanceOf(HttpError);
    });
  });

  describe("deleteTask", () => {
    it("deletes a plain id without looking it up by default or with mode all", async () => {
      await deleteTask("u1", "t1");
      await deleteTask("u1", "t1", "all");
      expect(taskRepository.findById).not.toHaveBeenCalled();
      expect(taskRepository.deleteById).toHaveBeenNthCalledWith(1, "u1", "t1");
      expect(taskRepository.deleteById).toHaveBeenNthCalledWith(2, "u1", "t1");
    });

    it("mode one on a plain id removes the first occurrence of a recurring task (same as events)", async () => {
      await deleteTask("u1", "t1", "one");
      expect(writesOf()).toEqual([{ op: "updateParent", data: { dueAt: day(2) } }]);
      expect(taskRepository.deleteById).not.toHaveBeenCalled();
    });

    it("mode one on a plain id of a non-recurring or missing task deletes it", async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue({ ...task, recurrence: "NONE" });
      await deleteTask("u1", "t1", "one");
      vi.mocked(taskRepository.findById).mockResolvedValue(null);
      await deleteTask("u1", "t1", "one");
      expect(taskRepository.deleteById).toHaveBeenCalledTimes(2);
    });

    it("mode all on an instance deletes the series by its series id, without a lookup", async () => {
      await deleteTask("u1", instanceId(day(3)), "all");
      expect(taskRepository.findById).not.toHaveBeenCalled();
      expect(taskRepository.deleteById).toHaveBeenCalledWith("u1", "t1");
    });

    it("404s for an instance of a missing series", async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(null);
      await expect(deleteTask("u1", instanceId(day(3)), "one")).rejects.toMatchObject({ status: 404 });
    });

    it("rejects a malformed instance id with 400", async () => {
      await expect(deleteTask("u1", "t1_rec_abc", "one")).rejects.toMatchObject({ status: 400, code: "tasks.invalidId" });
    });

    it("an instance id without a mode (or an unknown mode) removes only that occurrence (same as events)", async () => {
      await deleteTask("u1", instanceId(day(3)), null);
      await deleteTask("u1", instanceId(day(3)), "weird");
      const onlyThis = [
        { op: "updateParent", data: { recurrenceEnd: new Date(day(3).getTime() - 1000) } },
        { op: "create", data: expect.objectContaining({ dueAt: day(4), recurrence: "DAILY" }) },
      ];
      expect(writesOf(0)).toEqual(onlyThis);
      expect(writesOf(1)).toEqual(onlyThis);
      expect(taskRepository.deleteById).not.toHaveBeenCalled();
    });

    it("mode one limits an open-ended continuation to 6 months from now", async () => {
      vi.setSystemTime(new Date(2025, 0, 1)); // The next day falls beyond the six-month horizon.
      await deleteTask("u1", instanceId(day(3)), "one");
      expect(writesOf()).toEqual([{ op: "updateParent", data: { recurrenceEnd: new Date(day(3).getTime() - 1000) } }]);

      vi.setSystemTime(NOW);
      await deleteTask("u1", instanceId(day(3)), "one");
      expect(writesOf(1)[1]).toMatchObject({ op: "create", data: { dueAt: day(4) } });
    });

    it("mode one on the first occurrence shifts the parent", async () => {
      await deleteTask("u1", instanceId(DUE), "one");
      expect(writesOf()).toEqual([{ op: "updateParent", data: { dueAt: day(2) } }]);
    });

    it("mode future deletes from the first occurrence or truncates later", async () => {
      await deleteTask("u1", instanceId(DUE), "future");
      await deleteTask("u1", instanceId(day(5)), "future");
      expect(writesOf(0)).toEqual([{ op: "deleteParent" }]);
      expect(writesOf(1)).toEqual([{ op: "updateParent", data: { recurrenceEnd: new Date(day(5).getTime() - 1000) } }]);
    });
  });
});

describe("task schemas", () => {
  it("normalises empty values like the old route", () => {
    const parsed = updateTaskSchema.parse({ id: "t1", tagId: "", dueAt: "", recurrenceEnd: null, notification: 1, extra: "x" });
    expect(parsed).toEqual({ id: "t1", tagId: null, dueAt: null, recurrenceEnd: null, notification: true });
  });

  it("reports the old missing-id message first", () => {
    expect(updateTaskSchema.safeParse({ title: 5 }).error?.issues[0].message).toBe("tasks.missingId");
  });

  it("rejects invalid dates", () => {
    expect(createTaskSchema.safeParse({ title: "a", dueAt: "nope" }).success).toBe(false);
  });
});
