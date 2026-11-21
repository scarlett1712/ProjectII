import { addMonths } from "date-fns";
import {
  createTransaction,
  findOrCreateAccountByName,
  findOrCreateCategoryByName,
} from "@/features/budget/application/budgetUseCases";
import { TRANSACTION_TYPES, type TransactionKind } from "@/features/budget/domain/balance";
import { createCalendarEvent } from "@/features/calendar/application/calendarUseCases";
import { createMealEntry, listMealsSince } from "@/features/nutrition/application/mealUseCases";
import { getHealthProfile, recalculateProfileGoals } from "@/features/profile/application/profileUseCases";
import { createTask } from "@/features/tasks/application/taskUseCases";
import { logWater } from "@/features/water/application/waterUseCases";
import { createCalendarEventSchema } from "@/features/calendar/application/calendarSchemas";
import { createMealSchema } from "@/features/nutrition/application/mealSchemas";
import { createTaskSchema } from "@/features/tasks/application/taskSchemas";
import { logWaterSchema } from "@/features/water/application/waterSchemas";
import { defaultSeriesWindow, generateRecurringInstances } from "@/shared/domain/recurrence";
import { withAppOffset } from "@/shared/domain/time";
import { getApiTranslator, type ApiMessageKey } from "@/shared/i18n/apiTranslator";
import type { ZodError } from "zod";
import { chatRepository } from "../infrastructure/chatRepository";
import { searchWeb } from "../infrastructure/webSearchClient";

/** Tool arguments from the LLM are arbitrary JSON. Each handler validates its own fields. */
export type ToolArgs = Record<string, unknown>;

const str = (value: unknown) => (typeof value === "string" && value ? value : undefined);
/** Return a finite positive number or treat the value as omitted. */
const positive = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
/** Constrain an integer to the accepted range, using fallback for invalid input. */
const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= min ? Math.min(n, max) : fallback;
};
/** Return a valid date or the fallback date. */
const dateOr = (value: unknown, fallback: Date) => {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date : fallback;
};
/** Translate schema validation codes into error messages for the LLM when available. */
const invalidArgs = (error: ZodError) => {
  const t = getApiTranslator();
  const message = error.issues[0]?.message ?? "";
  return { error: t.has(message as ApiMessageKey) ? t(message as ApiMessageKey, undefined as never) : message || "Tham số không hợp lệ" };
};
const MAX_HISTORY_DAYS = 90;
const MAX_TRANSACTIONS = 200;
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};
const isTransactionKind = (value: unknown): value is TransactionKind =>
  TRANSACTION_TYPES.includes(value as TransactionKind);

type ToolContext = { args: ToolArgs; userId: string; sessionId: string };
const handlers = {
  async get_profile({ userId }) {
    const profile = await getHealthProfile(userId);
    return profile || { message: "Chưa có thông tin hồ sơ sức khỏe." };
  },
  async update_profile_and_recalculate_goals({ args, userId }) {
    const { dailyCalories, dailyTargetMl } = await recalculateProfileGoals(userId, {
      gender: str(args.gender),
      weightKg: positive(args.weightKg),
      heightCm: positive(args.heightCm),
      age: positive(args.age),
      activityLevel: str(args.activityLevel),
    });
    return {
      success: true,
      dailyCalories,
      dailyTargetMl,
      message: `Đã cập nhật mục tiêu mới: Calo là ${dailyCalories} kcal, nước uống là ${dailyTargetMl} ml nha bạn iu! 🌟`,
    };
  },
  async log_water({ args, userId, sessionId }) {
    const parsed = logWaterSchema.safeParse({ amountMl: args.amountMl });
    if (!parsed.success) return invalidArgs(parsed.error);
    const { amountMl } = parsed.data;
    const log = await logWater(userId, { amountMl });
    await chatRepository.logAction(sessionId, "LOG_WATER", log);
    return { success: true, amountMl, message: `Đã ghi nhận bạn iu uống ${amountMl}ml nước nha! 💧` };
  },
  async log_meal({ args, userId, sessionId }) {
    const mealName = str(args.mealName);
    if (!mealName) return { error: "Thiếu tên món ăn" };
    const parsed = createMealSchema.safeParse({
      mealName,
      calories: args.calories,
      grams: args.grams || 100,
      note: str(args.note) || "Vặt",
    });
    if (!parsed.success) return invalidArgs(parsed.error);
    const meal = await createMealEntry(userId, parsed.data);
    await chatRepository.logAction(sessionId, "ADD_MEAL", meal);
    const { calories } = parsed.data;
    return { success: true, mealName, calories, message: `Đã ghi nhận món "${mealName}" (${calories} kcal) rồi nè! 🍛` };
  },
  async add_task({ args, userId, sessionId }) {
    const title = str(args.title);
    if (!title) return { error: "Thiếu tiêu đề công việc" };
    const parsed = createTaskSchema.safeParse({ title });
    if (!parsed.success) return invalidArgs(parsed.error);
    const task = await createTask(userId, parsed.data);
    await chatRepository.logAction(sessionId, "ADD_TASK", task);
    return { success: true, title, message: `Đã thêm nhiệm vụ "${title}" vào ghi chú cho bạn iu nè! 📝` };
  },
  async add_event({ args, userId, sessionId }) {
    const title = str(args.title);
    if (!title) return { error: "Thiếu tiêu đề sự kiện" };
    const parsed = createCalendarEventSchema.safeParse({
      title,
      startAt: withAppOffset(args.startAt),
      endAt: withAppOffset(args.endAt),
    });
    if (!parsed.success) return invalidArgs(parsed.error);
    const event = await createCalendarEvent(userId, parsed.data);
    await chatRepository.logAction(sessionId, "ADD_EVENT", event);
    return { success: true, title, message: `Đã thêm sự kiện "${title}" vào lịch trình của cậu rồi nha! 📅` };
  },
  async get_nutrition_history({ args, userId }) {
    const days = clampInt(args.days, 1, MAX_HISTORY_DAYS, 7);
    const meals = await listMealsSince(userId, daysAgo(days));
    return { success: true, days, mealsCount: meals.length, meals };
  },
  async get_water_history({ args, userId }) {
    const days = clampInt(args.days, 1, MAX_HISTORY_DAYS, 7);
    const waterLogs = await chatRepository.waterLogsSince(userId, daysAgo(days));
    return { success: true, days, logsCount: waterLogs.length, waterLogs };
  },
  async get_tasks_and_events({ args, userId }) {
    const search = str(args.search);
    const now = new Date();
    const defaults = defaultSeriesWindow(now);
    const windowStart = dateOr(args.startDate, defaults.start);
    const windowEnd = dateOr(args.endDate, defaults.end);

    const [pendingTasks, events] = await Promise.all([
      chatRepository.pendingTasksMatching(userId, search),
      chatRepository.eventsMatching(userId, search),
    ]);
    const upcomingEvents = events
      .flatMap((event) => generateRecurringInstances(event, windowStart, windowEnd))
      .filter((inst) => {
        const start = new Date(inst.startAt);
        return start >= windowStart && start <= windowEnd;
      });

    return {
      success: true,
      pendingTasksCount: pendingTasks.length,
      pendingTasks,
      upcomingEventsCount: upcomingEvents.length,
      upcomingEvents,
    };
  },
  async get_budget_status({ userId }) {
    const { accounts, categories } = await chatRepository.budgetStatus(userId);
    return { success: true, accounts, categories };
  },
  async get_transaction_history({ args, userId }) {
    const now = new Date();
    const windowStart = dateOr(args.startDate, addMonths(now, -1));
    const windowEnd = dateOr(args.endDate, now);
    const transactions = await chatRepository.transactionHistory(userId, {
      start: windowStart,
      end: windowEnd,
      type: isTransactionKind(args.type) ? args.type : undefined,
      take: clampInt(args.limit, 1, MAX_TRANSACTIONS, 50),
    });
    return {
      success: true,
      startDate: windowStart.toISOString(),
      endDate: windowEnd.toISOString(),
      count: transactions.length,
      transactions,
    };
  },
  async search_web({ args }) {
    const query = String(args.query || "").trim();
    if (!query) return { error: "Vui lòng cung cấp từ khóa tìm kiếm" };
    return searchWeb(query);
  },
  log_transaction: ({ args, userId, sessionId }) => logTransactionFromChat(args, userId, sessionId),
} satisfies Record<string, (context: ToolContext) => Promise<unknown>>;

function hasHandler(name: string): name is keyof typeof handlers {
  return Object.prototype.hasOwnProperty.call(handlers, name);
}

/**
 * Execute a tool requested by the LLM. Writes go through the owning feature's use case.
 * Chat-specific reads use the read model in chatRepository.
 */
export async function executeChatTool(name: string, args: ToolArgs, userId: string, sessionId: string) {
  if (!hasHandler(name)) return { error: `Công cụ ${name} không tồn tại` };
  return handlers[name]({ args, userId, sessionId });
}

async function logTransactionFromChat(args: ToolArgs, userId: string, sessionId: string) {
  const value = Number(args.amount);
  if (!args.amount || isNaN(value) || value <= 0) {
    return { error: "Số tiền không hợp lệ" };
  }
  if (!isTransactionKind(args.type)) {
    return { error: "Phân loại không hợp lệ" };
  }
  const type = args.type;
  const categoryName = str(args.categoryName);
  const fromAccountName = str(args.fromAccountName);
  const toAccountName = str(args.toAccountName);

  const fromAccount =
    type !== "INCOME" && fromAccountName ? await findOrCreateAccountByName(userId, fromAccountName) : null;
  const toAccount =
    type !== "EXPENSE" && toAccountName ? await findOrCreateAccountByName(userId, toAccountName) : null;
  const category =
    type !== "TRANSFER" && categoryName ? await findOrCreateCategoryByName(userId, categoryName, type) : null;

  const txRecord = await createTransaction(userId, {
    amount: value,
    type,
    categoryId: category?.id,
    fromAccountId: fromAccount?.id,
    toAccountId: toAccount?.id,
    note: str(args.note),
  });
  await chatRepository.logAction(sessionId, "LOG_TRANSACTION", txRecord);

  return {
    success: true,
    transactionId: txRecord.id,
    message: `Đã ghi nhận giao dịch: ${type === "EXPENSE" ? "-" : ""}${value.toLocaleString("vi-VN")}đ cho mục ${categoryName || "chuyển khoản"} từ tài khoản ${fromAccountName || "hệ thống"} rồi nha! 🥰`,
  };
}
