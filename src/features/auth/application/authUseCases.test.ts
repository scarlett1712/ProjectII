import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/authRepository", () => ({
  authRepository: {
    findUserById: vi.fn(),
    findUserByEmail: vi.fn(),
    findUserWithProfileByEmail: vi.fn(),
    createUser: vi.fn(),
    updatePassword: vi.fn(),
    findLatestOtp: vi.fn(),
    replaceOtp: vi.fn(),
    deleteOtps: vi.fn(),
    incrementOtpAttempts: vi.fn(),
    resetPasswordByEmail: vi.fn(),
  },
}));
vi.mock("../infrastructure/passwordHasher", () => ({
  passwordHasher: { hash: vi.fn(async (p: string) => `hashed:${p}`), verify: vi.fn() },
}));
vi.mock("@/shared/infrastructure/email", () => ({ sendOtpEmail: vi.fn() }));
vi.mock("@/shared/infrastructure/token", () => ({ signMobileToken: vi.fn(() => "signed-token") }));

import { sendOtpEmail } from "@/shared/infrastructure/email";
import { HttpError } from "@/shared/application/errors";
import type { ApiMessageKey } from "@/shared/i18n/apiTranslator";
import { otpExpiry } from "../domain/otp";
import { authRepository } from "../infrastructure/authRepository";
import { passwordHasher } from "../infrastructure/passwordHasher";
import { changePassword, mobileLogin, registerUser, requestPasswordReset, resetPassword } from "./authUseCases";

type User = NonNullable<Awaited<ReturnType<typeof authRepository.findUserByEmail>>>;
type UserWithProfile = NonNullable<Awaited<ReturnType<typeof authRepository.findUserWithProfileByEmail>>>;
type Otp = NonNullable<Awaited<ReturnType<typeof authRepository.findLatestOtp>>>;

const NOW = new Date("2026-03-10T10:00:00Z");
const user = { id: "u1", email: "a@b.com", name: "An", passwordHash: "stored-hash" } as User;
const otp = (overrides: Partial<Otp> = {}): Otp => ({
  identifier: "a@b.com",
  token: "123456",
  attempts: 0,
  expires: otpExpiry(new Date(NOW.getTime() - 5 * 60 * 1000)),
  ...overrides,
});

async function expectHttpError(
  promise: Promise<unknown>,
  status: number,
  code?: ApiMessageKey,
  values?: HttpError["values"],
) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
  if (code) expect((error as HttpError).code).toBe(code);
  if (values) expect((error as HttpError).values).toEqual(values);
}

beforeEach(() => vi.clearAllMocks());

describe("registerUser", () => {
  it("stores the normalized email, bcrypt hash and trimmed name", async () => {
    await expect(registerUser({ email: " A@B.com ", password: "12345678", name: "  " })).resolves.toEqual({
      ok: true,
    });
    expect(authRepository.createUser).toHaveBeenCalledWith({
      email: "a@b.com",
      passwordHash: "hashed:12345678",
      name: null,
    });
  });

  it("maps a duplicate email to 409", async () => {
    vi.mocked(authRepository.createUser).mockRejectedValue({ code: "P2002" });
    await expectHttpError(registerUser({ email: "a@b.com", password: "12345678" }), 409, "auth.register.emailTaken");
  });

  it("maps database connection errors to 503", async () => {
    vi.mocked(authRepository.createUser).mockRejectedValue({ code: "P1001" });
    await expectHttpError(registerUser({ email: "a@b.com", password: "12345678" }), 503);
  });
});

describe("requestPasswordReset", () => {
  it("returns the generic success message without creating an OTP when the email is unknown", async () => {
    vi.mocked(authRepository.findLatestOtp).mockResolvedValue(null);
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);

    const result = await requestPasswordReset({ email: "nobody@b.com" }, NOW);

    expect(result).toEqual({
      ok: true,
      message: "Nếu email tồn tại trong hệ thống, mã xác thực đã được gửi. Vui lòng kiểm tra hộp thư (kể cả mục Spam).",
    });
    expect(authRepository.replaceOtp).not.toHaveBeenCalled();
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it("rejects a new request within 60 seconds of the previous one", async () => {
    vi.mocked(authRepository.findLatestOtp).mockResolvedValue(otp({ expires: otpExpiry(new Date(NOW.getTime() - 30_000)) }));
    await expectHttpError(requestPasswordReset({ email: "a@b.com" }, NOW), 429);
    expect(authRepository.findUserByEmail).not.toHaveBeenCalled();
  });

  it("replaces the OTP with a 15 minute expiry and emails it", async () => {
    vi.mocked(authRepository.findLatestOtp).mockResolvedValue(otp());
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(user);
    vi.mocked(sendOtpEmail).mockResolvedValue({ success: true, simulated: false });

    const result = await requestPasswordReset({ email: "A@b.com" }, NOW);

    const [email, code, expires] = vi.mocked(authRepository.replaceOtp).mock.calls[0];
    expect(email).toBe("a@b.com");
    expect(code).toMatch(/^\d{6}$/);
    expect(expires).toEqual(otpExpiry(NOW));
    expect(sendOtpEmail).toHaveBeenCalledWith({ to: "a@b.com", otp: code, name: "An", ttlMinutes: 15 });
    expect(result.devOtp).toBeUndefined();
  });
});

describe("resetPassword", () => {
  const input = { email: "a@b.com", otp: "123456", newPassword: "newpass123" };

  it("fails when there is no pending OTP", async () => {
    vi.mocked(authRepository.findLatestOtp).mockResolvedValue(null);
    await expectHttpError(resetPassword(input, NOW), 400);
  });

  it("deletes an expired OTP", async () => {
    vi.mocked(authRepository.findLatestOtp).mockResolvedValue(otp({ expires: new Date(NOW.getTime() - 1) }));
    await expectHttpError(resetPassword(input, NOW), 400);
    expect(authRepository.deleteOtps).toHaveBeenCalledWith("a@b.com");
    expect(authRepository.resetPasswordByEmail).not.toHaveBeenCalled();
  });

  it("deletes a locked OTP even when the code is right", async () => {
    vi.mocked(authRepository.findLatestOtp).mockResolvedValue(otp({ attempts: 5 }));
    await expectHttpError(resetPassword(input, NOW), 429);
    expect(authRepository.deleteOtps).toHaveBeenCalledWith("a@b.com");
    expect(authRepository.resetPasswordByEmail).not.toHaveBeenCalled();
  });

  it("counts a wrong code and reports remaining attempts", async () => {
    vi.mocked(authRepository.findLatestOtp).mockResolvedValue(otp({ attempts: 1 }));
    vi.mocked(authRepository.incrementOtpAttempts).mockResolvedValue(2);
    await expectHttpError(
      resetPassword({ ...input, otp: "000000" }, NOW),
      400,
      "auth.resetPassword.otpMismatch",
      { remaining: 3 },
    );
    expect(authRepository.incrementOtpAttempts).toHaveBeenCalledWith("a@b.com", "123456");
    expect(authRepository.deleteOtps).not.toHaveBeenCalled();
  });

  it("destroys the OTP on the fifth wrong code", async () => {
    vi.mocked(authRepository.findLatestOtp).mockResolvedValue(otp({ attempts: 4 }));
    vi.mocked(authRepository.incrementOtpAttempts).mockResolvedValue(5);
    await expectHttpError(resetPassword({ ...input, otp: "000000" }, NOW), 429);
    expect(authRepository.deleteOtps).toHaveBeenCalledWith("a@b.com");
  });

  it("returns 404 when the account vanished", async () => {
    vi.mocked(authRepository.findLatestOtp).mockResolvedValue(otp());
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);
    await expectHttpError(resetPassword(input, NOW), 404, "auth.resetPassword.accountNotFound");
  });

  it("hashes and stores the new password for a valid code", async () => {
    vi.mocked(authRepository.findLatestOtp).mockResolvedValue(otp());
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(user);
    await expect(resetPassword({ ...input, otp: " 123456" }, NOW)).resolves.toMatchObject({ ok: true });
    expect(authRepository.resetPasswordByEmail).toHaveBeenCalledWith("a@b.com", "hashed:newpass123");
  });
});

describe("changePassword", () => {
  const input = { currentPassword: "old", newPassword: "newpass123" };

  it("rejects a wrong current password", async () => {
    vi.mocked(authRepository.findUserById).mockResolvedValue(user);
    vi.mocked(passwordHasher.verify).mockResolvedValueOnce(false);
    await expectHttpError(changePassword("u1", input), 400, "auth.changePassword.wrongCurrentPassword");
  });

  it("rejects reusing the current password", async () => {
    vi.mocked(authRepository.findUserById).mockResolvedValue(user);
    vi.mocked(passwordHasher.verify).mockResolvedValue(true);
    await expectHttpError(changePassword("u1", input), 400, "auth.changePassword.sameAsCurrent");
    expect(authRepository.updatePassword).not.toHaveBeenCalled();
  });

  it("stores the new hash", async () => {
    vi.mocked(authRepository.findUserById).mockResolvedValue(user);
    vi.mocked(passwordHasher.verify).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(changePassword("u1", input)).resolves.toEqual({ ok: true, message: "Đổi mật khẩu thành công!" });
    expect(authRepository.updatePassword).toHaveBeenCalledWith("u1", "hashed:newpass123");
  });
});

describe("mobileLogin", () => {
  it("returns 401 for an unknown email", async () => {
    vi.mocked(authRepository.findUserWithProfileByEmail).mockResolvedValue(null);
    await expectHttpError(mobileLogin({ email: "x@b.com", password: "p" }), 401);
  });

  it("returns 401 for a wrong password", async () => {
    vi.mocked(authRepository.findUserWithProfileByEmail).mockResolvedValue({ ...user, profile: null } as UserWithProfile);
    vi.mocked(passwordHasher.verify).mockResolvedValue(false);
    await expectHttpError(mobileLogin({ email: "a@b.com", password: "p" }), 401, "auth.mobileLogin.invalidCredentials");
  });

  it("signs a token for valid credentials", async () => {
    vi.mocked(authRepository.findUserWithProfileByEmail).mockResolvedValue({ ...user, profile: null } as UserWithProfile);
    vi.mocked(passwordHasher.verify).mockResolvedValue(true);
    await expect(mobileLogin({ email: " A@b.com", password: "p" })).resolves.toEqual({
      token: "signed-token",
      user: { id: "u1", email: "a@b.com", name: "An", profile: null },
    });
    expect(authRepository.findUserWithProfileByEmail).toHaveBeenCalledWith("a@b.com");
  });
});
