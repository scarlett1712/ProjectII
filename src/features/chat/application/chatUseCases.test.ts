import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/chatRepository", () => ({
  chatRepository: {
    findSession: vi.fn(),
    createSession: vi.fn(),
    createMessage: vi.fn(),
    recentHistory: vi.fn(),
    loadUserSnapshot: vi.fn(),
    renameSession: vi.fn(),
    touchSession: vi.fn(),
    listSessionsWithMessageCount: vi.fn(),
    deleteSessions: vi.fn(),
    listMessages: vi.fn(async () => []),
  },
}));
vi.mock("../infrastructure/chatCompletionClient", () => ({ chatCompletionClient: { complete: vi.fn() } }));
vi.mock("./chatToolExecutor", () => ({ executeChatTool: vi.fn() }));

import { chatRepository } from "../infrastructure/chatRepository";
import type { ChatCompletionPort } from "./chatCompletionPort";
import { executeChatTool } from "./chatToolExecutor";
import { startOfAppDay as startOfVietnamDay } from "@/shared/domain/time";
import { getChatState, sendChatMessage } from "./chatUseCases";

const emptySnapshot = { userName: null, profile: null, todayMeals: [], todayWater: [], pendingTasks: [], accounts: [] };

describe("sendChatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chatRepository.createSession).mockResolvedValue({ id: "s1", title: "Cuộc trò chuyện mới" } as never);
    vi.mocked(chatRepository.recentHistory).mockResolvedValue([]);
    vi.mocked(chatRepository.loadUserSnapshot).mockResolvedValue(emptySnapshot as never);
    vi.mocked(chatRepository.createMessage).mockImplementation(
      ((_u: string, _s: string, role: string, content: string) => Promise.resolve({ role, content })) as never,
    );
  });

  it("runs requested tools, feeds results back and stores the final reply", async () => {
    const llm: ChatCompletionPort = {
      complete: vi
        .fn()
        .mockResolvedValueOnce({
          choices: [{ message: { role: "assistant", tool_calls: [{ id: "c1", function: { name: "log_water", arguments: '{"amountMl":200}' } }] } }],
        })
        .mockResolvedValueOnce({ choices: [{ message: { role: "assistant", content: "Xong nè" } }] }),
    };
    vi.mocked(executeChatTool).mockResolvedValue({ success: true } as never);

    const result = await sendChatMessage("u1", { content: "uống 200ml nước" }, llm);

    expect(executeChatTool).toHaveBeenCalledWith("log_water", { amountMl: 200 }, "u1", "s1");
    const secondCall = vi.mocked(llm.complete).mock.calls[1][0];
    expect(secondCall.at(-1)).toMatchObject({ role: "tool", tool_call_id: "c1", content: '{"success":true}' });
    expect(result.reply).toEqual({ role: "ASSISTANT", content: "Xong nè" });
    expect(chatRepository.renameSession).toHaveBeenCalledWith("u1", "s1", "uống 200ml nước");
  });

  it("stops after 4 tool rounds and replies with the fallback when the LLM keeps calling tools", async () => {
    const toolResponse = {
      choices: [{ message: { role: "assistant" as const, tool_calls: [{ id: "c", function: { name: "get_profile", arguments: "{}" } }] } }],
    };
    const llm: ChatCompletionPort = { complete: vi.fn().mockResolvedValue(toolResponse) };

    const result = await sendChatMessage("u1", { content: "hi" }, llm);

    expect(llm.complete).toHaveBeenCalledTimes(5);
    expect(result.reply.content).toBe("Sao đã làm xong rồi nha bạn iu! 🥰");
  });

  it("replies with the busy message when the LLM fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const llm: ChatCompletionPort = { complete: vi.fn().mockRejectedValue(new Error("down")) };

    const result = await sendChatMessage("u1", { content: "hi" }, llm);

    expect(result.reply.content).toContain("đang bận");
  });
});

describe("startOfVietnamDay", () => {
  it("returns 00:00 Vietnam time (17:00 UTC the day before) regardless of server time zone", () => {
    expect(startOfVietnamDay(new Date("2026-03-10T23:30:00Z")).toISOString()).toBe("2026-03-10T17:00:00.000Z");
    expect(startOfVietnamDay(new Date("2026-03-10T16:59:00Z")).toISOString()).toBe("2026-03-09T17:00:00.000Z");
  });
});

describe("getChatState empty-session cleanup", () => {
  it("only deletes empty sessions older than a minute (a session just created by a send is kept)", async () => {
    const now = new Date("2026-03-10T10:00:00Z");
    vi.mocked(chatRepository.listSessionsWithMessageCount).mockResolvedValueOnce([
      { id: "old-empty", createdAt: new Date("2026-03-10T09:00:00Z"), _count: { messages: 0 } },
      { id: "fresh-empty", createdAt: new Date("2026-03-10T09:59:50Z"), _count: { messages: 0 } },
      { id: "with-messages", createdAt: new Date("2026-03-01T00:00:00Z"), _count: { messages: 3 } },
    ] as never);
    await getChatState("u1", null, now).catch(() => undefined);
    expect(chatRepository.deleteSessions).toHaveBeenCalledWith("u1", ["old-empty"]);
  });
});

describe("chat request schemas", () => {
  it("splits and caps the sessions to delete", async () => {
    const { deleteSessionsSchema } = await import("./chatSchemas");
    expect(deleteSessionsSchema.parse("a, b,,c")).toEqual(["a", "b", "c"]);
    expect(() => deleteSessionsSchema.parse(null)).toThrow("chat.missingSessionId");
    expect(() => deleteSessionsSchema.parse(Array.from({ length: 51 }, (_, i) => `s${i}`).join(","))).toThrow("chat.tooManySessions");
  });
});
