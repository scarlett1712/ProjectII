import type { TaskItem } from "@prisma/client";
import { db } from "@/shared/infrastructure/db";
import type { TaskFields } from "../domain/taskSeries";
import type { SeriesWrite } from "@/shared/domain/recurringSeries";
import { applySeriesWrites } from "@/shared/infrastructure/seriesWrites";

export const taskRepository = {
  findAll(userId: string) {
    return db.taskItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(userId: string, id: string) {
    return db.taskItem.findFirst({ where: { id, userId } });
  },

  create(userId: string, data: TaskFields) {
    return db.taskItem.create({ data: { ...data, userId } });
  },

  /** Update the user's task and read it back, returning null if no matching record exists. */
  async updateAndFind(userId: string, id: string, data: Partial<TaskFields>) {
    await db.taskItem.updateMany({ where: { id, userId }, data });
    return db.taskItem.findFirst({ where: { id, userId } });
  },

  async deleteById(userId: string, id: string) {
    await db.taskItem.deleteMany({ where: { id, userId } });
  },

  /** Apply the series writes sequentially in one transaction and return the last written record. */
  applySeriesWrites(userId: string, seriesId: string, writes: SeriesWrite<TaskFields>[]): Promise<TaskItem | null> {
    return applySeriesWrites((tx) => tx.taskItem, userId, seriesId, writes);
  },
};
