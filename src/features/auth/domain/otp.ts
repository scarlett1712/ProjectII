import { timingSafeEqual } from "crypto";
import { OTP_RESEND_COOLDOWN_SEC } from "@/shared/domain/accountPolicy";

/** Password-reset codes expire after 15 minutes. */
export const OTP_TTL_MS = 15 * 60 * 1000;
/** Each email address must wait 60 seconds before requesting another code. */
export const OTP_RESEND_COOLDOWN_MS = OTP_RESEND_COOLDOWN_SEC * 1000;
/** Invalidate the code once failed attempts reach this limit. */
export const MAX_OTP_ATTEMPTS = 5;

export interface StoredOtp {
  token: string;
  attempts: number;
  expires: Date;
}

export type OtpCheck = "expired" | "locked" | "mismatch" | "valid";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Six-digit code from 100000 to 999999. */
export function generateOtp(random: () => number = Math.random): string {
  return Math.floor(100000 + random() * 900000).toString();
}

export function otpExpiry(now: Date): Date {
  return new Date(now.getTime() + OTP_TTL_MS);
}

/** The latest code was issued less than OTP_RESEND_COOLDOWN_MS ago, as inferred from its expiry. */
export function isWithinResendCooldown(latest: Pick<StoredOtp, "expires">, now: Date): boolean {
  const msSinceCreation = OTP_TTL_MS - (latest.expires.getTime() - now.getTime());
  return msSinceCreation < OTP_RESEND_COOLDOWN_MS;
}

/** Check expiration first, then the attempt limit, then the code itself. */
export function checkOtp(stored: StoredOtp, otp: string, now: Date): OtpCheck {
  if (now > stored.expires) return "expired";
  if (stored.attempts >= MAX_OTP_ATTEMPTS) return "locked";
  if (!sameCode(stored.token, otp)) return "mismatch";
  return "valid";
}

/** Compare codes in constant time so response timing cannot reveal the position of a mismatch. */
function sameCode(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Attempts remaining after recording the given number of failures. */
export function remainingOtpAttempts(attempts: number): number {
  return MAX_OTP_ATTEMPTS - attempts;
}
