import { apiErrorResponse } from "./apiError";
import { globalRateLimiter } from "@/shared/infrastructure/rateLimiter";

export { InMemoryRateLimiter } from "@/shared/infrastructure/rateLimiter";

export function rateLimitResponse(resetSec: number) {
  return apiErrorResponse(429, "common.tooManyRequests", undefined, {
    headers: { "Retry-After": String(resetSec) },
    extra: { retryAfter: resetSec },
  });
}

export function applyRateLimit(
  req: Request,
  options?: { keyPrefix?: string; limit?: number; windowMs?: number }
) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous";

  const key = `${options?.keyPrefix || "api"}:${ip}`;
  const result = globalRateLimiter.check(key, {
    maxRequests: options?.limit ?? 30,
    windowMs: options?.windowMs ?? 60000,
  });

  return result;
}
