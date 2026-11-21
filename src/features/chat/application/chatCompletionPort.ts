/** OpenAI chat completions message format used by Gemini and OpenClaw. */
export interface LlmToolCall {
  id: string;
  type?: "function";
  function: { name: string; arguments: string | Record<string, unknown> };
}

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: LlmToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface LlmResponse {
  choices?: { message?: LlmMessage }[];
}

/** Language model port. Switching providers requires changing only the infrastructure adapter. */
export interface ChatCompletionPort {
  complete(messages: LlmMessage[]): Promise<LlmResponse>;
}
