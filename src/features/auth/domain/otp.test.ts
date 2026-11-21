import { describe, expect, it } from "vitest";
import {
  MAX_OTP_ATTEMPTS,
  OTP_TTL_MS,
  checkOtp,
  generateOtp,
  isWithinResendCooldown,
  normalizeEmail,
  otpExpiry,
  remainingOtpAttempts,
} from "./otp";

const NOW = new Date("2026-03-10T10:00:00Z");

describe("otp", () => {
  it("normalizes email by trimming and lower-casing", () => {
    expect(normalizeEmail("  Foo@Example.COM ")).toBe("foo@example.com");
  });

  it("generates 6-digit codes across the random range", () => {
    expect(generateOtp(() => 0)).toBe("100000");
    expect(generateOtp(() => 0.999999)).toBe("999999");
    expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it("expires 15 minutes after creation", () => {
    expect(otpExpiry(NOW).getTime() - NOW.getTime()).toBe(OTP_TTL_MS);
  });

  it("enforces a 60 second resend cooldown derived from the expiry", () => {
    const createdAt = (msAgo: number) => ({ expires: otpExpiry(new Date(NOW.getTime() - msAgo)) });
    expect(isWithinResendCooldown(createdAt(0), NOW)).toBe(true);
    expect(isWithinResendCooldown(createdAt(59_999), NOW)).toBe(true);
    expect(isWithinResendCooldown(createdAt(60_000), NOW)).toBe(false);
  });

  describe("checkOtp", () => {
    const stored = { token: "123456", attempts: 0, expires: otpExpiry(NOW) };

    it("accepts the matching code before expiry", () => {
      expect(checkOtp(stored, "123456", NOW)).toBe("valid");
      expect(checkOtp(stored, "123456", stored.expires)).toBe("valid");
    });

    it("rejects after expiry even if the code matches", () => {
      expect(checkOtp(stored, "123456", new Date(stored.expires.getTime() + 1))).toBe("expired");
    });

    it("locks after the maximum number of wrong attempts even if the code matches", () => {
      expect(checkOtp({ ...stored, attempts: MAX_OTP_ATTEMPTS }, "123456", NOW)).toBe("locked");
      expect(checkOtp({ ...stored, attempts: MAX_OTP_ATTEMPTS - 1 }, "123456", NOW)).toBe("valid");
    });

    it("reports a mismatch for a wrong code", () => {
      expect(checkOtp(stored, "654321", NOW)).toBe("mismatch");
    });
  });

  it("computes remaining attempts", () => {
    expect(remainingOtpAttempts(1)).toBe(4);
    expect(remainingOtpAttempts(5)).toBe(0);
  });
});
