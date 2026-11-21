import { NextRequest } from "next/server";
import { badRequest, withErrorHandling, withUser } from "@/shared/presentation/http";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  mobileLoginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../../application/authSchemas";
import {
  changePassword,
  mobileLogin,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "../../application/authUseCases";

const MINUTE_MS = 60 * 1000;

/** Treat malformed bodies as empty so Zod returns the usual validation error. */
const readJsonOrNull = (req: NextRequest): Promise<unknown> => req.json().catch(() => null);

export const registerHandler = withErrorHandling(
  async (req) => {
    const body: unknown = await req.json().catch(() => {
      throw badRequest("auth.register.invalidBody");
    });
    return registerUser(registerSchema.parse(body));
  },
  { errorCode: "auth.register.serverError", rateLimit: { keyPrefix: "register", limit: 10, windowMs: 10 * MINUTE_MS } },
);

export const forgotPasswordHandler = withErrorHandling(
  async (req) => {
    return requestPasswordReset(forgotPasswordSchema.parse(await readJsonOrNull(req)));
  },
  { errorCode: "auth.forgotPassword.serverError", rateLimit: { keyPrefix: "forgot-pw", limit: 3, windowMs: 5 * MINUTE_MS } },
);

export const resetPasswordHandler = withErrorHandling(
  async (req) => {
    return resetPassword(resetPasswordSchema.parse(await readJsonOrNull(req)));
  },
  { errorCode: "auth.resetPassword.serverError", rateLimit: { keyPrefix: "reset-pw", limit: 5, windowMs: MINUTE_MS } },
);

/** Apply the IP rate limit before authentication. */
export const changePasswordHandler = withUser(
  async (req, userId) => changePassword(userId, changePasswordSchema.parse(await readJsonOrNull(req))),
  { errorCode: "auth.changePassword.serverError", rateLimit: { keyPrefix: "change-pw", limit: 5, windowMs: MINUTE_MS } },
);

export const mobileLoginHandler = withErrorHandling(
  async (req) => {
    return mobileLogin(mobileLoginSchema.parse(await readJsonOrNull(req)));
  },
  { errorCode: "auth.mobileLogin.serverError", rateLimit: { keyPrefix: "mobile-login", limit: 10, windowMs: MINUTE_MS } },
);
