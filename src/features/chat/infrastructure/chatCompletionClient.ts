import { postChatCompletion } from "@/shared/infrastructure/llmGateway";
import { CHAT_TOOLS } from "../application/chatTools";
import type { ChatCompletionPort, LlmResponse } from "../application/chatCompletionPort";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"];

/** Chat LLM adapter. Include tool definitions and propagate OpenClaw errors so the chat can display its busy reply. */
export const chatCompletionClient: ChatCompletionPort = {
  async complete(messages) {
    const res = await postChatCompletion({
      geminiModels: GEMINI_MODELS,
      payload: { messages, tools: CHAT_TOOLS, temperature: 0.3 },
      logLabel: "call",
    });
    if (!res.ok) {
      throw new Error(`OpenClaw responded with status ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as LlmResponse;
  },
};
