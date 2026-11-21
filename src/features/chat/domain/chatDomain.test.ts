import { describe, expect, it } from "vitest";
import { buildGuestReply } from "./guestReply";
import { buildDynamicSystemPrompt, SYSTEM_PROMPT } from "./systemPrompt";

describe("buildGuestReply", () => {
  it("answers password questions", () => {
    expect(buildGuestReply("tôi quên mật khẩu")).toContain("Quên mật khẩu");
  });

  it("falls back to the guest-mode message", () => {
    expect(buildGuestReply("xin chào")).toContain("chế độ khách");
  });
});

describe("buildDynamicSystemPrompt", () => {
  it("summarises today's data after the static prompt", () => {
    const prompt = buildDynamicSystemPrompt(
      {
        userName: "An",
        profile: { gender: "MALE", weightKg: 60, heightCm: 170, dailyCalories: 2200 },
        todayMeals: [{ mealName: "Phở", calories: 450 }, { mealName: "Cơm", calories: null }],
        todayWater: [{ amountMl: 250 }, { amountMl: 300 }],
        pendingTasks: [{ title: "Học bài" }],
        accounts: [{ balance: 1000 }, { balance: 500 }],
      },
      new Date("2026-01-01T00:00:00Z"),
    );

    expect(prompt.startsWith(SYSTEM_PROMPT)).toBe(true);
    expect(prompt).toContain("Đã nạp 450 kcal (Gồm: Phở 450kcal, Cơm nullkcal) / Mục tiêu: 2200 kcal.");
    expect(prompt).toContain("Lượng nước uống hôm nay: 550 ml.");
    expect(prompt).toContain("Nhiệm vụ cần làm (1 việc): Học bài.");
    expect(prompt).toContain("UTC: 2026-01-01T00:00:00.000Z");
  });

  it("uses placeholders for a user without data", () => {
    const prompt = buildDynamicSystemPrompt({
      userName: null, profile: null, todayMeals: [], todayWater: [], pendingTasks: [], accounts: [],
    });
    expect(prompt).toContain("(Chưa ghi nhận món nào) / Mục tiêu: 2000 kcal.");
    expect(prompt).toContain("Đã xong hết việc!");
  });
});
