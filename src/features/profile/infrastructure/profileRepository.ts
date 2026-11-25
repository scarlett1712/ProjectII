import { db } from "@/shared/infrastructure/db";
import type { ProfileData } from "../domain/profileData";

export interface UserIdentityUpdate {
  name?: string;
  image?: string | null;
}

export const profileRepository = {
  findProfile(userId: string) {
    return db.profile.findUnique({ where: { userId } });
  },

  findUserIdentity(userId: string) {
    return db.user.findUnique({ where: { id: userId }, select: { name: true, image: true, email: true } });
  },

  upsertProfile(userId: string, data: ProfileData) {
    return db.profile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },

  /** Update only user identity fields (name/image) without modifying health measurements. */
  async updateUserIdentity(userId: string, identity: UserIdentityUpdate) {
    if (Object.keys(identity).length > 0) {
      await db.user.update({ where: { id: userId }, data: identity });
    }
    return db.profile.findUnique({ where: { userId } });
  },

  /** Update the supplied name and image along with the health profile in one transaction. */
  saveProfileWithIdentity(userId: string, identity: UserIdentityUpdate, data: ProfileData) {
    return db.$transaction(async (tx) => {
      if (Object.keys(identity).length > 0) {
        await tx.user.update({ where: { id: userId }, data: identity });
      }
      return tx.profile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });
    });
  },
};
