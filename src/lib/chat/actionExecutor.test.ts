import { describe, expect, it, vi, beforeEach } from "vitest";
import { executeIntent } from "./actionExecutor";

vi.mock("@/lib/db", () => {
  return {
    db: {
      mealEntry: {
        create: vi.fn().mockResolvedValue({ id: "meal-1", mealName: "Phở", calories: 350, grams: 150 }),
      },
      taskItem: {
        create: vi.fn().mockResolvedValue({ id: "task-1", title: "Nộp bài" }),
      },
      calendarEvent: {
        create: vi.fn().mockResolvedValue({ id: "event-1", title: "Họp" }),
      },
      waterGoal: {
        create: vi.fn().mockResolvedValue({ id: "wg-1", dailyTargetMl: 2000 }),
      },
      waterLog: {
        create: vi.fn().mockResolvedValue({ id: "wl-1", amountMl: 250 }),
      },
      chatActionLog: {
        create: vi.fn().mockResolvedValue({ id: "action-1" }),
      },
    },
  };
});

describe("executeIntent", () => {
  const userId = "test-user-id";
  const sessionId = "test-session-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles ADD_MEAL intent correctly", async () => {
    const res = await executeIntent({
      userId,
      sessionId,
      intent: { type: "ADD_MEAL", mealName: "Cơm tấm", calories: 500, grams: 200 },
    });
    expect(res).toContain("500 kcal");
  });

  it("handles ADD_TASK intent correctly", async () => {
    const res = await executeIntent({
      userId,
      sessionId,
      intent: { type: "ADD_TASK", title: "Làm bài tập" },
    });
    expect(res).toContain("Đã tạo công việc");
  });

  it("handles ADD_EVENT intent correctly", async () => {
    const res = await executeIntent({
      userId,
      sessionId,
      intent: {
        type: "ADD_EVENT",
        title: "Họp nhóm",
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(),
      },
    });
    expect(res).toContain("Đã thêm sự kiện vào lịch");
  });

  it("handles SET_WATER_GOAL intent correctly", async () => {
    const res = await executeIntent({
      userId,
      sessionId,
      intent: { type: "SET_WATER_GOAL", dailyTargetMl: 2000 },
    });
    expect(res).toContain("2000ml");
  });

  it("handles LOG_WATER intent correctly", async () => {
    const res = await executeIntent({
      userId,
      sessionId,
      intent: { type: "LOG_WATER", amountMl: 300 },
    });
    expect(res).toContain("300ml nước");
  });

  it("handles SMALL_TALK with default helper text", async () => {
    const res = await executeIntent({
      userId,
      sessionId,
      intent: { type: "SMALL_TALK" },
    });
    expect(res).toContain("trợ lý ảo");
  });
});
