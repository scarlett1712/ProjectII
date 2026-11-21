import { db } from "@/shared/infrastructure/db";

export const authRepository = {
  findUserById(id: string) {
    return db.user.findUnique({ where: { id } });
  },

  findUserByEmail(email: string) {
    return db.user.findUnique({ where: { email } });
  },

  findUserWithProfileByEmail(email: string) {
    return db.user.findUnique({ where: { email }, include: { profile: true } });
  },

  createUser(data: { email: string; passwordHash: string; name: string | null }) {
    return db.user.create({ data: { ...data, role: "USER" } });
  },

  /** Change the password and increment tokenVersion to revoke existing web sessions. */
  async updatePassword(userId: string, passwordHash: string) {
    await db.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
  },

  findLatestOtp(email: string) {
    return db.verificationToken.findFirst({
      where: { identifier: email },
      orderBy: { expires: "desc" },
    });
  },

  /** Remove previous codes for this email and store the new code with zero attempts. */
  async replaceOtp(email: string, token: string, expires: Date) {
    await db.$transaction([
      db.verificationToken.deleteMany({ where: { identifier: email } }),
      db.verificationToken.create({ data: { identifier: email, token, attempts: 0, expires } }),
    ]);
  },

  async deleteOtps(email: string) {
    await db.verificationToken.deleteMany({ where: { identifier: email } });
  },

  /** Increment the failed-attempt count and return the updated value. */
  async incrementOtpAttempts(email: string, token: string): Promise<number> {
    const updated = await db.verificationToken.update({
      where: { identifier_token: { identifier: email, token } },
      data: { attempts: { increment: 1 } },
    });
    return updated.attempts;
  },

  /** Set the new password, revoke existing sessions and invalidate the used OTP in one transaction. */
  async resetPasswordByEmail(email: string, passwordHash: string) {
    await db.$transaction([
      db.user.update({
        where: { email },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      db.verificationToken.deleteMany({ where: { identifier: email } }),
    ]);
  },
};
