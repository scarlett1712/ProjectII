import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/notificationRepository", () => ({
  notificationRepository: {
    upsertSubscription: vi.fn(),
    deleteSubscription: vi.fn(),
    findReminderCandidates: vi.fn(),
    claimReminderKeys: vi.fn(async (keys: string[]) => new Set(keys)),
    pruneSentReminders: vi.fn(),
  },
}));
vi.mock("@/shared/infrastructure/webpush", () => ({
  sendPushToUser: vi.fn(async () => ({ sent: 1, failed: 0, total: 1 })),
  getVapidPublicKey: vi.fn(() => ""),
}));

import { sendPushToUser } from "@/shared/infrastructure/webpush";
import { notificationRepository } from "../infrastructure/notificationRepository";
import { testPushSchema, unregisterSubscriptionSchema } from "./notificationSchemas";
import { runReminderCron, sendTestPush, syncUserReminders, unregisterPushSubscription } from "./notificationUseCases";

const NOW = new Date("2026-03-10T01:30:00Z"); // 08:30 in Vietnam.

describe("runReminderCron", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries candidates for the current window and Vietnam time, pushes each reminder and counts them", async () => {
    vi.mocked(sendPushToUser).mockRejectedValueOnce(new Error("push down"));
    vi.mocked(notificationRepository.findReminderCandidates).mockResolvedValue({
      tasks: [{ id: "t1", userId: "u1", title: "Việc", dueAt: NOW }],
      events: [],
      waterSlots: [
        { id: "w1", userId: "u2", slotTime: "08:30", amountMl: 200 },
        { id: "w2", userId: "u3", slotTime: "08:30", amountMl: 300 },
      ],
      waterLogs: [],
    });

    const result = await runReminderCron(NOW);

    const [windows, slotTimes, , userId] = vi.mocked(notificationRepository.findReminderCandidates).mock.calls[0];
    // Every minute from 08:00 through 08:30 in Vietnam.
    expect(slotTimes[0]).toBe("08:00");
    expect(slotTimes.at(-1)).toBe("08:30");
    expect(slotTimes).toHaveLength(31);
    expect(windows.task.start.getTime()).toBe(NOW.getTime() - 30 * 60 * 1000);
    expect(userId).toBeUndefined();
    expect(sendPushToUser).toHaveBeenCalledTimes(3);
    expect(sendPushToUser).toHaveBeenCalledWith("u2", {
      title: "Nhắc nhở uống nước ⭐",
      body: "Đã đến giờ uống nước: 200ml (08:30) 💧",
      data: { url: "/nutrition" },
    });
    // A failed push still counts toward the total and does not interrupt the cron job.
    expect(result).toEqual({
      success: true,
      timestamp: NOW.toISOString(),
      currentTimeStr: "08:30",
      processed: { tasks: 1, events: 0, water: 2 },
    });
  });
});

describe("runReminderCron de-duplication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("only pushes reminders that were not sent before and prunes old marks", async () => {
    vi.mocked(notificationRepository.findReminderCandidates).mockResolvedValue({
      tasks: [
        { id: "t1", userId: "u1", title: "A", dueAt: NOW },
        { id: "t2", userId: "u1", title: "B", dueAt: NOW },
      ],
      events: [],
      waterSlots: [],
      waterLogs: [],
    });
    vi.mocked(notificationRepository.claimReminderKeys).mockResolvedValueOnce(new Set([`task_t2_${NOW.getTime()}`]));

    const result = await runReminderCron(NOW);

    expect(sendPushToUser).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendPushToUser).mock.calls[0][1].body).toContain("B");
    expect(result.processed).toEqual({ tasks: 1, events: 0, water: 0 });
    expect(notificationRepository.pruneSentReminders).toHaveBeenCalledWith(new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000));
  });
});

describe("push subscription & test push", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unregister without endpoint is a no-op", async () => {
    await expect(unregisterPushSubscription("u1", unregisterSubscriptionSchema.parse(null))).resolves.toEqual({
      success: true,
    });
    expect(notificationRepository.deleteSubscription).not.toHaveBeenCalled();
  });

  it("unregister deletes only the caller's subscription", async () => {
    await unregisterPushSubscription("u1", unregisterSubscriptionSchema.parse({ endpoint: "https://e" }));
    expect(notificationRepository.deleteSubscription).toHaveBeenCalledWith("u1", "https://e");
  });

  it("test push only targets the authenticated user and falls back to default texts", async () => {
    await sendTestPush("u1", testPushSchema.parse({ title: "", message: 42 }));
    expect(sendPushToUser).toHaveBeenCalledWith("u1", {
      title: "Little Star Thông Báo Thử ⭐",
      body: "Thông báo thử nghiệm Web Push hoạt động tuyệt vời! 🎉",
      data: { url: "/dashboard" },
    });
  });

  it("test push reports how many devices received it", async () => {
    vi.mocked(sendPushToUser).mockResolvedValueOnce({ sent: 2, failed: 1, total: 3 });
    const result = await sendTestPush("u1", testPushSchema.parse({}));
    expect(result).toMatchObject({ success: true, sent: 2, total: 3 });
    expect(result.message).toContain("2/3");
  });

  it("test push fails clearly without devices or when every send fails", async () => {
    vi.mocked(sendPushToUser).mockResolvedValueOnce({ sent: 0, failed: 0, total: 0 });
    await expect(sendTestPush("u1", testPushSchema.parse({}))).rejects.toMatchObject({ status: 400 });
    vi.mocked(sendPushToUser).mockResolvedValueOnce({ sent: 0, failed: 2, total: 2 });
    await expect(sendTestPush("u1", testPushSchema.parse({}))).rejects.toMatchObject({ status: 502 });
  });
});

describe("syncUserReminders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("only looks at the signed-in user's reminders and does not prune the shared log", async () => {
    vi.mocked(notificationRepository.findReminderCandidates).mockResolvedValue({
      tasks: [{ id: "t1", userId: "u1", title: "A", dueAt: NOW }],
      events: [],
      waterSlots: [],
      waterLogs: [],
    });
    const result = await syncUserReminders("u1", NOW);
    expect(vi.mocked(notificationRepository.findReminderCandidates).mock.calls[0][3]).toBe("u1");
    expect(result.processed).toEqual({ tasks: 1, events: 0, water: 0 });
    expect(notificationRepository.pruneSentReminders).not.toHaveBeenCalled();
  });
});
