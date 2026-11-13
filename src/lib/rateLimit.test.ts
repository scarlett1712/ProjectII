import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryRateLimiter, rateLimitResponse, applyRateLimit } from "./rateLimit";

describe("InMemoryRateLimiter", () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter({ windowMs: 1000, maxRequests: 3 });
  });

  it("allows requests under the maximum limit", () => {
    const res1 = limiter.check("user-1");
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check("user-1");
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check("user-1");
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("blocks requests that exceed the limit", () => {
    limiter.check("user-2");
    limiter.check("user-2");
    limiter.check("user-2");

    const blocked = limiter.check("user-2");
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.reset).toBeGreaterThan(0);
  });

  it("isolates rate limits by key", () => {
    limiter.check("user-a");
    limiter.check("user-a");
    limiter.check("user-a");
    const blockedA = limiter.check("user-a");
    expect(blockedA.success).toBe(false);

    const allowedB = limiter.check("user-b");
    expect(allowedB.success).toBe(true);
    expect(allowedB.remaining).toBe(2);
  });

  it("resets limits when explicitly called", () => {
    limiter.check("user-c");
    limiter.check("user-c");
    limiter.check("user-c");
    expect(limiter.check("user-c").success).toBe(false);

    limiter.reset("user-c");
    const afterReset = limiter.check("user-c");
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(2);
  });
});

describe("rateLimitResponse", () => {
  it("creates a 429 response with Retry-After header", async () => {
    const res = rateLimitResponse(15);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("15");

    const data = await res.json();
    expect(data.error).toContain("Quá nhiều yêu cầu");
    expect(data.retryAfter).toBe(15);
  });
});

describe("applyRateLimit helper", () => {
  it("extracts IP and correctly checks rate limit", () => {
    const fakeReq = new Request("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "192.168.1.100" },
    });

    const result = applyRateLimit(fakeReq, { keyPrefix: "test-ip", limit: 5 });
    expect(result.success).toBe(true);
    expect(result.limit).toBe(5);
  });
});
