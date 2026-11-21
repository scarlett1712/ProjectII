import { postChatCompletion } from "@/shared/infrastructure/llmGateway";
import type { NutritionAiPort } from "../application/nutritionAiPort";

const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3.1-flash-lite"];

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

/** Nutrition AI adapter. Try Gemini directly, then the OpenClaw gateway. Return null for a failed response. */
export const nutritionAiClient: NutritionAiPort = {
  async complete(request) {
    // Treat network failures, including an unavailable OpenClaw gateway, as service failures so the caller can use its fallback.
    try {
      const res = await postChatCompletion({
        geminiModels: GEMINI_MODELS,
        payload: {
          messages: [
            { role: "system", content: request.systemPrompt },
            { role: "user", content: request.userPrompt },
          ],
          temperature: 0.2,
        },
        logLabel: request.purpose,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as ChatCompletionResponse;
      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      console.error(`Nutrition AI ${request.purpose} error:`, err);
      return null;
    }
  },
};
