import crypto from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signMobileToken, verifyMobileToken } from "./token";

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const hmac = (data: string) => crypto.createHmac("sha256", "test-secret").update(data).digest("base64url");

describe("token.ts - Mobile JWT authentication", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("signs a token and verifies it back to its claims", () => {
    const token = signMobileToken("cuid-user-123456", 3);
    expect(token.split(".").length).toBe(3);
    expect(verifyMobileToken(token)).toEqual({ userId: "cuid-user-123456", tokenVersion: 3 });
  });

  it("treats tokens signed without a version as version 0", () => {
    const header = b64({ alg: "HS256", typ: "JWT" });
    const payload = b64({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 60 });
    expect(verifyMobileToken(`${header}.${payload}.${hmac(`${header}.${payload}`)}`)).toEqual({ userId: "u1", tokenVersion: 0 });
  });

  it("returns null for tampered token payload", () => {
    const parts = signMobileToken("cuid-user-123456").split(".");
    const tamperedPayload = b64({ sub: "hacker-victim-789", exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(verifyMobileToken(`${parts[0]}.${tamperedPayload}.${parts[2]}`)).toBeNull();
  });

  it("rejects a header with another algorithm even when the signature matches", () => {
    const header = b64({ alg: "none", typ: "JWT" });
    const payload = b64({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 60 });
    expect(verifyMobileToken(`${header}.${payload}.${hmac(`${header}.${payload}`)}`)).toBeNull();
  });

  it("rejects expired tokens and tokens without exp", () => {
    const header = b64({ alg: "HS256", typ: "JWT" });
    for (const claims of [{ sub: "u1", exp: Math.floor(Date.now() / 1000) - 1 }, { sub: "u1" }]) {
      const payload = b64(claims);
      expect(verifyMobileToken(`${header}.${payload}.${hmac(`${header}.${payload}`)}`)).toBeNull();
    }
  });

  it("returns null for invalid token format", () => {
    expect(verifyMobileToken("invalid-token")).toBeNull();
    expect(verifyMobileToken("part1.part2")).toBeNull();
    expect(verifyMobileToken("")).toBeNull();
  });

  it("refuses to sign without a configured secret", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => signMobileToken("u1")).toThrow(/NEXTAUTH_SECRET/);
  });
});
