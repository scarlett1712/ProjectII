import type { CalendarEvent } from "@prisma/client";
import { db } from "@/shared/infrastructure/db";
import type { CalendarEventFields } from "../domain/eventSeries";
import type { SeriesWrite } from "@/shared/domain/recurringSeries";
import { applySeriesWrites } from "@/shared/infrastructure/seriesWrites";

export const calendarRepository = {
  findAll(userId: string) {
    return db.calendarEvent.findMany({
      where: { userId },
      orderBy: { startAt: "asc" },
    });
  },

  findById(userId: string, id: string) {
    return db.calendarEvent.findFirst({ where: { id, userId } });
  },

  create(userId: string, data: CalendarEventFields) {
    return db.calendarEvent.create({ data: { ...data, userId } });
  },

  /** Prisma throws (HTTP 500) if the user has no event with this ID. The use case checks findById first. */
  update(userId: string, id: string, data: Partial<CalendarEventFields>) {
    return db.calendarEvent.update({ where: { id, userId }, data });
  },

  async deleteById(userId: string, id: string) {
    await db.calendarEvent.deleteMany({ where: { id, userId } });
  },

  /** Apply series writes sequentially in one transaction and return the last written record. */
  applySeriesWrites(userId: string, seriesId: string, writes: SeriesWrite<CalendarEventFields>[]): Promise<CalendarEvent | null> {
    return applySeriesWrites((tx) => tx.calendarEvent, userId, seriesId, writes);
  },
};
