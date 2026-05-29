import { db } from "@/lib/db";
import { ParsedIntent } from "@/lib/chat/intentParser";

export async function executeIntent(params: {
  userId: string;
  sessionId: string;
  intent: ParsedIntent;
}) {
  const { userId, sessionId, intent } = params;
  switch (intent.type) {
    case "ADD_MEAL": {
      const meal = await db.mealEntry.create({
        data: {
          userId,
          mealName: intent.mealName,
          calories: intent.calories,
          grams: intent.grams,
          eatenAt: new Date(),
        },
      });
      await db.chatActionLog.create({
        data: {
          sessionId,
          actionType: "ADD_MEAL",
          payload: meal,
        },
      });
      return `Mình đã ghi lại bữa ăn của bạn (${intent.calories} kcal) rồi nhé!`;
    }
    case "ADD_TASK": {
      const task = await db.taskItem.create({
        data: { userId, title: intent.title },
      });
      await db.chatActionLog.create({
        data: { sessionId, actionType: "ADD_TASK", payload: task },
      });
      return "Đã tạo công việc mới cho bạn.";
    }
    case "ADD_EVENT": {
      const event = await db.calendarEvent.create({
        data: {
          userId,
          title: intent.title,
          startAt: new Date(intent.startAt),
          endAt: new Date(intent.endAt),
        },
      });
      await db.chatActionLog.create({
        data: { sessionId, actionType: "ADD_EVENT", payload: event },
      });
      return "Đã thêm sự kiện vào lịch của bạn.";
    }
    case "SET_WATER_GOAL": {
      const goal = await db.waterGoal.create({
        data: { userId, dailyTargetMl: intent.dailyTargetMl },
      });
      await db.chatActionLog.create({
        data: { sessionId, actionType: "SET_WATER_GOAL", payload: goal },
      });
      return `Đã cập nhật mục tiêu uống nước của bạn thành ${intent.dailyTargetMl}ml.`;
    }
    case "LOG_WATER": {
      const log = await db.waterLog.create({
        data: { userId, amountMl: intent.amountMl, loggedAt: new Date() },
      });
      await db.chatActionLog.create({
        data: { sessionId, actionType: "LOG_WATER", payload: log },
      });
      return `Đã ghi nhận bạn vừa uống ${intent.amountMl}ml nước. Tuyệt vời!`;
    }
    default:
      return "Mình là trợ lý ảo. Bạn có thể yêu cầu mình thêm bữa ăn (vd: 'ăn phở 300 calo'), ghi nhận uống nước (vd: 'uống 200ml nước'), hoặc tạo công việc/lịch.";
  }
}
