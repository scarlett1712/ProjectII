import type { MessageRole, Prisma, TransactionType } from "@prisma/client";
import { db } from "@/shared/infrastructure/db";

const containsInsensitive = (search: string) => ({ contains: search, mode: "insensitive" as const });

/** Read model for chat sessions, messages, action logs and chat-specific queries. */
export const chatRepository = {
  listSessionsWithMessageCount(userId: string) {
    return db.chatSession.findMany({
      where: { userId },
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: "desc" },
    });
  },

  deleteSessions(userId: string, ids: string[]) {
    return db.chatSession.deleteMany({ where: { id: { in: ids }, userId } });
  },

  findSession(userId: string, id: string) {
    return db.chatSession.findFirst({ where: { id, userId } });
  },

  createSession(userId: string, title: string) {
    return db.chatSession.create({ data: { userId, title } });
  },

  renameSession(userId: string, id: string, title: string) {
    return db.chatSession.update({ where: { id, userId }, data: { title } });
  },

  touchSession(userId: string, id: string) {
    return db.chatSession.update({ where: { id, userId }, data: { updatedAt: new Date() } });
  },

  listMessages(userId: string, sessionId: string) {
    return db.chatMessage.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: "asc" },
    });
  },

  /** Return the latest take messages in chronological order. */
  async recentHistory(userId: string, sessionId: string, take: number) {
    const latest = await db.chatMessage.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: "desc" },
      take,
    });
    return latest.reverse();
  },

  createMessage(userId: string, sessionId: string, role: MessageRole, content: string) {
    return db.chatMessage.create({ data: { userId, sessionId, role, content } });
  },

  logAction(sessionId: string, actionType: string, payload: object) {
    return db.chatActionLog.create({
      data: { sessionId, actionType, payload: payload as Prisma.InputJsonValue },
    });
  },

  async loadUserSnapshot(userId: string, todayStart: Date) {
    const [profile, user, todayMeals, todayWater, pendingTasks, accounts] = await Promise.all([
      db.profile.findUnique({ where: { userId } }),
      db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
      db.mealEntry.findMany({
        where: { userId, eatenAt: { gte: todayStart } },
        select: { mealName: true, calories: true },
      }),
      db.waterLog.findMany({
        where: { userId, loggedAt: { gte: todayStart } },
        select: { amountMl: true },
      }),
      db.taskItem.findMany({
        where: { userId, completed: false },
        take: 6,
        select: { title: true, dueAt: true },
      }),
      db.budgetAccount.findMany({
        where: { userId },
        select: { name: true, balance: true },
      }),
    ]);
    return { userName: user?.name, profile, todayMeals, todayWater, pendingTasks, accounts };
  },

  waterLogsSince(userId: string, since: Date) {
    return db.waterLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      orderBy: { loggedAt: "desc" },
    });
  },

  pendingTasksMatching(userId: string, search?: string) {
    return db.taskItem.findMany({
      where: {
        userId,
        completed: false,
        ...(search
          ? { OR: [{ title: containsInsensitive(search) }, { description: containsInsensitive(search) }] }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  },

  eventsMatching(userId: string, search?: string) {
    return db.calendarEvent.findMany({
      where: {
        userId,
        ...(search
          ? { OR: [{ title: containsInsensitive(search) }, { description: containsInsensitive(search) }] }
          : {}),
      },
      orderBy: { startAt: "asc" },
    });
  },

  async budgetStatus(userId: string) {
    const [accounts, categories] = await Promise.all([
      db.budgetAccount.findMany({ where: { userId } }),
      db.budgetCategory.findMany({ where: { userId } }),
    ]);
    return { accounts, categories };
  },

  transactionHistory(
    userId: string,
    options: { start: Date; end: Date; type?: TransactionType; take: number },
  ) {
    return db.budgetTransaction.findMany({
      where: {
        userId,
        occurredAt: { gte: options.start, lte: options.end },
        ...(options.type ? { type: options.type } : {}),
      },
      include: { category: true, fromAccount: true, toAccount: true },
      orderBy: { occurredAt: "desc" },
      take: options.take,
    });
  },
};
