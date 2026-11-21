import { db } from "./db";

/** Current tokenVersion for mobile token revocation, or null if the account no longer exists. */
export async function findUserTokenVersion(userId: string): Promise<number | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { tokenVersion: true } });
  return user ? user.tokenVersion : null;
}
