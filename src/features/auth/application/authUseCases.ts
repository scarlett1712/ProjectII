import { randomInt } from "crypto";
import { sendOtpEmail } from "@/shared/infrastructure/email";
import { signMobileToken } from "@/shared/infrastructure/token";
import { badRequest, HttpError, notFound } from "@/shared/application/errors";
import {
  checkOtp,
  generateOtp,
  isWithinResendCooldown,
  normalizeEmail,
  OTP_TTL_MS,
  otpExpiry,
  remainingOtpAttempts,
} from "../domain/otp";
import { getApiTranslator } from "@/shared/i18n/apiTranslator";
import { authRepository } from "../infrastructure/authRepository";
import { passwordHasher } from "../infrastructure/passwordHasher";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  MobileLoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./authSchemas";

export async function registerUser(input: RegisterInput) {
  const email = normalizeEmail(input.email);
  const passwordHash = await passwordHasher.hash(input.password);

  try {
    await authRepository.createUser({ email, passwordHash, name: input.name?.trim() || null });
  } catch (error) {
    const code = prismaErrorCode(error);
    if (code === "P2002") throw new HttpError(409, "auth.register.emailTaken");
    if (code === "P1000" || code === "P1001") {
      throw new HttpError(
        503,
        "auth.register.databaseUnavailable",
      );
    }
    throw error;
  }
  return { ok: true };
}

/**
 * Send a password-reset OTP. Unknown email addresses receive the same success response
 * without generating a code or sending email.
 */
export async function requestPasswordReset(input: ForgotPasswordInput, now = new Date()) {
  const email = normalizeEmail(input.email);

  // Allow at most one code per email address every 60 seconds.
  const latest = await authRepository.findLatestOtp(email);
  if (latest && isWithinResendCooldown(latest, now)) {
    throw new HttpError(429, "auth.forgotPassword.resendCooldown");
  }

  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    return {
      ok: true,
      message: getApiTranslator()("auth.forgotPassword.sentIfExists"),
    };
  }

  // Use cryptographically secure randomness. An attacker who requests codes could predict Math.random output.
  const otp = generateOtp(secureRandom);
  await authRepository.replaceOtp(email, otp, otpExpiry(now));
  const emailRes = await sendOtpEmail({ to: email, otp, name: user.name, ttlMinutes: OTP_TTL_MS / 60_000 });

  return {
    ok: true,
    message: getApiTranslator()("auth.forgotPassword.sent"),
    // Expose the code only during local development without SMTP.
    devOtp: process.env.NODE_ENV !== "production" && emailRes.simulated ? otp : undefined,
  };
}

export async function resetPassword(input: ResetPasswordInput, now = new Date()) {
  const email = normalizeEmail(input.email);
  const otp = input.otp.trim();

  const stored = await authRepository.findLatestOtp(email);
  if (!stored) {
    throw badRequest("auth.resetPassword.requestNotFound");
  }

  switch (checkOtp(stored, otp, now)) {
    case "expired":
      await authRepository.deleteOtps(email);
      throw badRequest("auth.resetPassword.otpExpired");
    case "locked":
      // Invalidate the code immediately to limit guessing attempts.
      await authRepository.deleteOtps(email);
      throw new HttpError(
        429,
        "auth.resetPassword.otpLocked",
      );
    case "mismatch": {
      const remaining = remainingOtpAttempts(await authRepository.incrementOtpAttempts(email, stored.token));
      if (remaining <= 0) {
        await authRepository.deleteOtps(email);
        throw new HttpError(429, "auth.resetPassword.otpAttemptsExceeded");
      }
      throw badRequest("auth.resetPassword.otpMismatch", { remaining });
    }
    case "valid":
      break;
  }

  const user = await authRepository.findUserByEmail(email);
  if (!user) throw notFound("auth.resetPassword.accountNotFound");

  const passwordHash = await passwordHasher.hash(input.newPassword);
  await authRepository.resetPasswordByEmail(email, passwordHash);

  return {
    ok: true,
    message: getApiTranslator()("auth.resetPassword.success"),
  };
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await authRepository.findUserById(userId);
  if (!user || !user.passwordHash) {
    throw badRequest("auth.changePassword.invalidAccount");
  }
  if (!(await passwordHasher.verify(input.currentPassword, user.passwordHash))) {
    throw badRequest("auth.changePassword.wrongCurrentPassword");
  }
  if (await passwordHasher.verify(input.newPassword, user.passwordHash)) {
    throw badRequest("auth.changePassword.sameAsCurrent");
  }

  await authRepository.updatePassword(userId, await passwordHasher.hash(input.newPassword));
  return { ok: true, message: getApiTranslator()("auth.changePassword.success") };
}

export async function mobileLogin(input: MobileLoginInput) {
  const user = await authRepository.findUserWithProfileByEmail(normalizeEmail(input.email));
  if (!user || !user.passwordHash || !(await passwordHasher.verify(input.password, user.passwordHash))) {
    throw new HttpError(401, "auth.mobileLogin.invalidCredentials");
  }

  return {
    token: signMobileToken(user.id, user.tokenVersion),
    user: { id: user.id, email: user.email, name: user.name, profile: user.profile },
  };
}

/** A uniform CSPRNG value in [0, 1) with sufficient precision for all 900,000 possible OTPs. */
function secureRandom(): number {
  return randomInt(0, 900000) / 900000;
}

function prismaErrorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
}
