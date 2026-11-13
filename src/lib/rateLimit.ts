import { NextResponse } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

interface RateLimitConfig {
  windowMs: number; // Duration of window in milliseconds (default: 60000ms = 1m)
  maxRequests: number; // Maximum allowed requests within the window
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private lastCleanup = Date.now();
  private cleanupInterval = 60000; // Cleanup stale records every minute

  constructor(private defaultConfig: RateLimitConfig = { windowMs: 60000, maxRequests: 30 }) {}

  private cleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) return;
    this.lastCleanup = now;

    for (const [key, record] of this.store.entries()) {
      const validTimestamps = record.timestamps.filter(
        (ts) => now - ts < this.defaultConfig.windowMs
      );
      if (validTimestamps.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, { timestamps: validTimestamps });
      }
    }
  }

  public check(
    key: string,
    customConfig?: Partial<RateLimitConfig>
  ): {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  } {
    this.cleanup();

    const windowMs = customConfig?.windowMs ?? this.defaultConfig.windowMs;
    const maxRequests = customConfig?.maxRequests ?? this.defaultConfig.maxRequests;
    const now = Date.now();
    const windowStart = now - windowMs;

    const existing = this.store.get(key);
    const timestamps = existing
      ? existing.timestamps.filter((ts) => ts > windowStart)
      : [];

    if (timestamps.length >= maxRequests) {
      const oldest = timestamps[0];
      const reset = Math.ceil((oldest + windowMs - now) / 1000);
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: reset > 0 ? reset : 1,
      };
    }

    timestamps.push(now);
    this.store.set(key, { timestamps });

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - timestamps.length,
      reset: Math.ceil(windowMs / 1000),
    };
  }

  public reset(key?: string) {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

// Global instance across requests in the Node.js process
const globalRateLimiter = new InMemoryRateLimiter({
  windowMs: 60000,
  maxRequests: 30, // 30 requests per minute
});

export { InMemoryRateLimiter, globalRateLimiter };

export function rateLimitResponse(resetSec: number) {
  return NextResponse.json(
    {
      error: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
      retryAfter: resetSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(resetSec),
      },
    }
  );
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
