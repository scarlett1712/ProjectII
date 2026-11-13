import { describe, expect, it } from "vitest";
import { parseIntent } from "./intentParser";

describe("parseIntent", () => {
  describe("Meal Intent", () => {
    it("parses meal intent with calories and dish name", () => {
      const intent = parseIntent("Tôi vừa ăn bữa trưa cơm tấm 550 calo");
      expect(intent.type).toBe("ADD_MEAL");
      if (intent.type === "ADD_MEAL") {
        expect(intent.calories).toBe(550);
        expect(intent.mealName).toContain("cơm tấm");
      }
    });

    it("parses meal intent with grams and kcal", () => {
      const intent = parseIntent("ăn phở bò 200g 450 kcal");
      expect(intent.type).toBe("ADD_MEAL");
      if (intent.type === "ADD_MEAL") {
        expect(intent.calories).toBe(450);
        expect(intent.grams).toBe(200);
      }
    });
  });

  describe("Water Intent", () => {
    it("parses water goal with liters", () => {
      const intent = parseIntent("nhắc tôi uống 2l nước");
      expect(intent.type).toBe("SET_WATER_GOAL");
      if (intent.type === "SET_WATER_GOAL") {
        expect(intent.dailyTargetMl).toBe(2000);
      }
    });

    it("parses water goal with ml", () => {
      const intent = parseIntent("mục tiêu uống 2500ml mỗi ngày");
      expect(intent.type).toBe("SET_WATER_GOAL");
      if (intent.type === "SET_WATER_GOAL") {
        expect(intent.dailyTargetMl).toBe(2500);
      }
    });

    it("parses logging water in ml", () => {
      const intent = parseIntent("vừa uống 300ml nước");
      expect(intent.type).toBe("LOG_WATER");
      if (intent.type === "LOG_WATER") {
        expect(intent.amountMl).toBe(300);
      }
    });

    it("parses logging water by cups", () => {
      const intent = parseIntent("đã uống 2 cốc nước");
      expect(intent.type).toBe("LOG_WATER");
      if (intent.type === "LOG_WATER") {
        expect(intent.amountMl).toBe(500); // 2 * 250ml
      }
    });
  });

  describe("Task & Event Intent", () => {
    it("parses task creation", () => {
      const intent = parseIntent("nhắc việc nộp bài tập lớn Project II");
      expect(intent.type).toBe("ADD_TASK");
      if (intent.type === "ADD_TASK") {
        expect(intent.title).toContain("nộp bài tập");
      }
    });

    it("parses event creation with hour", () => {
      const intent = parseIntent("lịch họp báo cáo lúc 14h");
      expect(intent.type).toBe("ADD_EVENT");
      if (intent.type === "ADD_EVENT") {
        expect(intent.title).toContain("lịch họp báo cáo");
        expect(intent.startAt).toBeDefined();
        expect(intent.endAt).toBeDefined();
      }
    });
  });

  describe("Small Talk Fallback", () => {
    it("falls back to SMALL_TALK for general conversation", () => {
      const intent = parseIntent("Xin chào Bé Sao, hôm nay trời đẹp quá!");
      expect(intent.type).toBe("SMALL_TALK");
    });
  });
});
