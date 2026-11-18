import { describe, expect, it } from "vitest";
import { signMobileToken, verifyMobileToken } from "./token";

describe("token.ts - Mobile JWT authentication", () => {
  it("signs a token and successfully verifies it", () => {
    const userId = "cuid-user-123456";
    const token = signMobileToken(userId);

    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const verifiedId = verifyMobileToken(token);
    expect(verifiedId).toBe(userId);
  });

  it("returns null for tampered token payload", () => {
    const userId = "cuid-user-123456";
    const token = signMobileToken(userId);
    const parts = token.split(".");

    // Tamper with payload (sub)
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        sub: "hacker-victim-789",
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString("base64url");

    const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    expect(verifyMobileToken(forgedToken)).toBeNull();
  });

  it("returns null for invalid token format", () => {
    expect(verifyMobileToken("invalid-token")).toBeNull();
    expect(verifyMobileToken("part1.part2")).toBeNull();
    expect(verifyMobileToken("")).toBeNull();
  });
});
