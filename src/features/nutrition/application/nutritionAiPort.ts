export interface ChatCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Short description for logs, such as "calorie estimation". */
  purpose: string;
}

/**
 * Port for the external AI chat completion service.
 * Return the first message's content, an empty string if absent, or null on HTTP or network failure.
 */
export interface NutritionAiPort {
  complete(request: ChatCompletionRequest): Promise<string | null>;
}
