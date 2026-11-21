import { db } from "@/shared/infrastructure/db";
import type { ReminderSlot } from "../domain/reminderSlots";

export type WaterEntryType = "log" | "slot";

export const waterRepository = {
  findActiveGoal(userId: string) {
    return db.waterGoal.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: "desc" },
    });
  },

  findRecentLogs(userId: string, take: number) {
    return db.waterLog.findMany({
      where: { userId },
      orderBy: { loggedAt: "desc" },
      take,
    });
  },

  findSlots(userId: string) {
    return db.waterReminderSlot.findMany({
      where: { userId },
      orderBy: { slotTime: "asc" },
    });
  },

  /** Disable the old goal, create the new goal and replace all reminder slots in one transaction. */
  replaceActiveGoal(userId: string, dailyTargetMl: number, slots: ReminderSlot[]) {
    return db.$transaction(async (tx) => {
      await tx.waterGoal.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });
      const goal = await tx.waterGoal.create({ data: { userId, dailyTargetMl } });
      await tx.waterReminderSlot.deleteMany({ where: { userId } });
      await tx.waterReminderSlot.createMany({
        data: slots.map((slot) => ({ userId, ...slot })),
      });
      return goal;
    });
  },

  createLog(userId: string, amountMl: number, loggedAt: Date) {
    return db.waterLog.create({ data: { userId, amountMl, loggedAt } });
  },

  async deleteEntry(userId: string, id: string, type: WaterEntryType) {
    if (type === "slot") {
      await db.waterReminderSlot.deleteMany({ where: { id, userId } });
    } else {
      await db.waterLog.deleteMany({ where: { id, userId } });
    }
  },
};
