import { z } from "zod";
import { messageKey } from "@/shared/application/errors";
import { OTP_LENGTH, PASSWORD_MIN_LENGTH } from "@/shared/domain/accountPolicy";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH, messageKey("auth.validation.passwordMinLength")),
  name: z.string().max(120).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(messageKey("auth.validation.invalidEmail")),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(messageKey("auth.validation.invalidEmail")),
  otp: z.string().length(OTP_LENGTH, messageKey("auth.validation.otpLength")),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH, messageKey("auth.validation.newPasswordMinLength")),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, messageKey("auth.validation.currentPasswordRequired")),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH, messageKey("auth.validation.newPasswordMinLength")),
});

const MISSING_CREDENTIALS = messageKey("auth.validation.missingCredentials");

export const mobileLoginSchema = z.object(
  {
    email: z.string({ error: MISSING_CREDENTIALS }).min(1, MISSING_CREDENTIALS),
    password: z.string({ error: MISSING_CREDENTIALS }).min(1, MISSING_CREDENTIALS),
  },
  { error: MISSING_CREDENTIALS },
);

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface MobileLoginInput {
  email: string;
  password: string;
}
