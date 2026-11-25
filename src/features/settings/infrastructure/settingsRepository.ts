import { db } from "@/shared/infrastructure/db";
import type { UpdateSettingsInput } from "../application/settingsSchemas";

export const settingsRepository = {
  findByUserId(userId: string) {
    return db.userSettings.findUnique({ where: { userId } });
  },

  upsert(userId: string, data: UpdateSettingsInput) {
    return db.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  },
};
