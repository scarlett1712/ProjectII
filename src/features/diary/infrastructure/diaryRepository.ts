import { db } from "@/shared/infrastructure/db";

const photoInclude = {
  meal: {
    select: {
      id: true,
      mealName: true,
      grams: true,
      calories: true,
      note: true,
      eatenAt: true,
    },
  },
  transaction: {
    select: {
      id: true,
      amount: true,
      type: true,
      note: true,
      occurredAt: true,
      category: {
        select: { id: true, name: true, color: true },
      },
    },
  },
} as const;

export const diaryRepository = {
  findMonthPhotos(userId: string, monthPrefix: string) {
    return db.diaryPhoto.findMany({
      where: { userId, dateKey: { startsWith: `${monthPrefix}-` } },
      include: photoInclude,
      orderBy: { takenAt: "desc" },
    });
  },

  async findMonthJournalKeys(userId: string, monthPrefix: string): Promise<string[]> {
    const entries = await db.diaryEntry.findMany({
      where: {
        userId,
        dateKey: { startsWith: `${monthPrefix}-` },
        content: { not: "" },
      },
      select: { dateKey: true },
    });
    return entries.map((e) => e.dateKey);
  },

  findEntry(userId: string, dateKey: string) {
    return db.diaryEntry.findUnique({
      where: { userId_dateKey: { userId, dateKey } },
    });
  },

  findDayPhotos(userId: string, dateKey: string) {
    return db.diaryPhoto.findMany({
      where: { userId, dateKey },
      include: photoInclude,
      orderBy: { takenAt: "desc" },
    });
  },

  upsertEntry(userId: string, dateKey: string, content: string, mood: string | null) {
    return db.diaryEntry.upsert({
      where: { userId_dateKey: { userId, dateKey } },
      update: { content, mood },
      create: { userId, dateKey, content, mood },
    });
  },

  findMealOwned(userId: string, id: string) {
    return db.mealEntry.findFirst({ where: { id, userId }, select: { id: true } });
  },

  findTransactionOwned(userId: string, id: string) {
    return db.budgetTransaction.findFirst({ where: { id, userId }, select: { id: true } });
  },

  createPhoto(
    userId: string,
    data: {
      dateKey: string;
      takenAt: Date;
      imageData: string;
      caption: string | null;
      mealId: string | null;
      transactionId: string | null;
    },
  ) {
    return db.diaryPhoto.create({
      data: { userId, ...data },
      include: photoInclude,
    });
  },

  async updatePhoto(
    userId: string,
    id: string,
    data: { caption?: string | null; mealId?: string | null; transactionId?: string | null },
  ) {
    const existing = await db.diaryPhoto.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) return null;
    return db.diaryPhoto.update({
      where: { id },
      data,
      include: photoInclude,
    });
  },

  findPhotoForDelete(userId: string, id: string) {
    return db.diaryPhoto.findFirst({
      where: { id, userId },
      select: { id: true, mealId: true, transactionId: true },
    });
  },

  async deletePhoto(userId: string, id: string) {
    const result = await db.diaryPhoto.deleteMany({ where: { id, userId } });
    return result.count > 0;
  },
};
