const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions";
/** Limit each model call to 30 seconds to prevent requests from hanging indefinitely. */
const LLM_TIMEOUT_MS = 30_000;

export interface ChatCompletionCall {
  /** Gemini models to try in order when GEMINI_API_KEY is configured. */
  geminiModels: string[];
  /** OpenAI-compatible request body excluding the model field. */
  payload: Record<string, unknown>;
  /** Warning log label, such as "call" or "estimate". */
  logLabel: string;
}

/**
 * Try direct Gemini chat completions first, then the OpenClaw gateway.
 * Return the first successful Gemini response or the OpenClaw response, including unsuccessful HTTP statuses.
 * Propagate OpenClaw network errors to the caller.
 */
export async function postChatCompletion({ geminiModels, payload, logLabel }: ChatCompletionCall): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    for (const model of geminiModels) {
      try {
        const res = await fetch(GEMINI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, ...payload }),
          signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
        });
        if (res.ok) return res;
        console.warn(`Direct Gemini ${logLabel} with model ${model} failed (status ${res.status}):`, await res.text());
      } catch (err) {
        console.error(`Direct Gemini ${logLabel} with model ${model} error:`, err);
      }
    }
  }

  const url = `${process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789"}/v1/chat/completions`;
  const token = process.env.OPENCLAW_TOKEN;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ model: "openclaw", ...payload }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });
}
