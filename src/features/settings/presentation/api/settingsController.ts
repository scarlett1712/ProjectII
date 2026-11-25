import { NextRequest } from "next/server";
import { readJson, withUser } from "@/shared/presentation/http";
import { updateSettingsSchema } from "../../application/settingsSchemas";
import { getUserSettings, updateUserSettings } from "../../application/settingsUseCases";

export const getSettingsHandler = withUser(
  async (_req: NextRequest, userId) => getUserSettings(userId),
  { errorCode: "settings.loadFailed" },
);

export const patchSettingsHandler = withUser(
  async (req: NextRequest, userId) => {
    const input = updateSettingsSchema.parse(await readJson(req));
    return updateUserSettings(userId, input);
  },
  { errorCode: "settings.saveFailed" },
);
