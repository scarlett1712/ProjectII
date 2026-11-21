import { db } from "@/shared/infrastructure/db";

export const tagRepository = {
  findAll(userId: string) {
    return db.calendarTag.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  },

  create(userId: string, name: string, color: string) {
    return db.calendarTag.create({ data: { userId, name, color, isSystem: false } });
  },

  async update(userId: string, id: string, name: string, color: string) {
    await db.calendarTag.updateMany({ where: { id, userId }, data: { name, color } });
  },

  async deleteById(userId: string, id: string) {
    await db.calendarTag.deleteMany({ where: { id, userId } });
  },
};
