import { db } from "@/shared/infrastructure/db";

export interface MealEntryData {
  mealName: string;
  grams: number;
  calories: number;
  eatenAt: Date;
  note: string | null;
}

export type MealEntryPatch = Partial<MealEntryData>;

export const mealRepository = {
  findRecent(userId: string, take: number) {
    return db.mealEntry.findMany({
      where: { userId },
      include: { _count: { select: { diaryPhotos: true } } },
      orderBy: { eatenAt: "desc" },
      take,
    });
  },

  findSince(userId: string, since: Date) {
    return db.mealEntry.findMany({
      where: { userId, eatenAt: { gte: since } },
      orderBy: { eatenAt: "desc" },
    });
  },

  findById(userId: string, id: string) {
    return db.mealEntry.findFirst({ where: { id, userId } });
  },

  create(userId: string, data: MealEntryData) {
    return db.mealEntry.create({ data: { userId, ...data } });
  },

  /** Prisma throws if the meal is missing or belongs to another user. */
  update(userId: string, id: string, data: MealEntryPatch) {
    return db.mealEntry.update({ where: { id, userId }, data });
  },

  async deleteLinkedPhotos(userId: string, mealId: string) {
    await db.diaryPhoto.deleteMany({ where: { userId, mealId } });
  },

  async delete(userId: string, id: string) {
    await db.mealEntry.deleteMany({ where: { id, userId } });
  },
};
