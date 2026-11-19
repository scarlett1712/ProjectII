import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("./db", () => ({
  db: {
    waterReminderSlot: {
      findMany: vi.fn(),
    },
    taskItem: {
      findMany: vi.fn(),
    },
    calendarEvent: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("./webpush", () => ({
  sendPushToUser: vi.fn().mockResolvedValue({ sent: 1, failed: 0, total: 1 }),
}));

import { db } from "./db";
import { sendPushToUser } from "./webpush";
import { processReminders } from "./reminderRunner";

describe("reminderRunner.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles empty reminders gracefully", async () => {
    vi.mocked(db.waterReminderSlot.findMany).mockResolvedValue([]);
    vi.mocked(db.taskItem.findMany).mockResolvedValue([]);
    vi.mocked(db.calendarEvent.findMany).mockResolvedValue([]);

    const result = await processReminders("user-1");
    expect(result).toEqual({ tasks: 0, events: 0, water: 0 });
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  it("triggers due task notifications and sends push", async () => {
    const now = new Date();
    vi.mocked(db.waterReminderSlot.findMany).mockResolvedValue([]);
    vi.mocked(db.calendarEvent.findMany).mockResolvedValue([]);
    vi.mocked(db.taskItem.findMany).mockResolvedValue([
      {
        id: "task-test-1",
        userId: "user-1",
        title: "Hoàn thành bài tập",
        dueAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 min ago
        completed: false,
        notification: true,
      } as any,
    ]);

    const result = await processReminders("user-1");
    expect(result.tasks).toBe(1);
    expect(sendPushToUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        title: "Nhắc nhở công việc ⭐",
        body: expect.stringContaining("Hoàn thành bài tập"),
      })
    );
  });
});
