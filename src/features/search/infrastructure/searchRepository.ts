import { db } from "@/shared/infrastructure/db";
import type { SearchMatches } from "../domain/searchResults";

export const searchRepository = {
  /** Search the user's own data case-insensitively, returning up to take of the most recent records per type. */
  async findMatches(userId: string, query: string, take: number): Promise<SearchMatches> {
    const contains = { contains: query, mode: "insensitive" as const };
    const [events, tasks, meals, transactions] = await Promise.all([
      db.calendarEvent.findMany({
        where: { userId, title: contains },
        select: { id: true, title: true, startAt: true },
        take,
        orderBy: { startAt: "desc" },
      }),
      db.taskItem.findMany({
        where: { userId, title: contains },
        select: { id: true, title: true, completed: true },
        take,
        orderBy: { createdAt: "desc" },
      }),
      db.mealEntry.findMany({
        where: { userId, mealName: contains },
        select: { id: true, mealName: true, grams: true, calories: true },
        take,
        orderBy: { eatenAt: "desc" },
      }),
      db.budgetTransaction.findMany({
        where: { userId, note: contains },
        select: { id: true, note: true, type: true, amount: true },
        take,
        orderBy: { occurredAt: "desc" },
      }),
    ]);
    return { events, tasks, meals, transactions };
  },
};
