import { DEFAULT_USER_SETTINGS, type UserSettingsData } from "../domain/settingsTypes";
import { settingsRepository } from "../infrastructure/settingsRepository";
import type { UpdateSettingsInput } from "./settingsSchemas";

function toSettingsData(row: Partial<Record<keyof UserSettingsData, unknown>> | null): UserSettingsData {
  if (!row) return { ...DEFAULT_USER_SETTINGS };
  return {
    theme: (row.theme as UserSettingsData["theme"]) ?? DEFAULT_USER_SETTINGS.theme,
    fontSize: (row.fontSize as UserSettingsData["fontSize"]) ?? DEFAULT_USER_SETTINGS.fontSize,
    notificationsEnabled: (row.notificationsEnabled as boolean | undefined) ?? DEFAULT_USER_SETTINGS.notificationsEnabled,
    quietHoursEnabled: (row.quietHoursEnabled as boolean | undefined) ?? DEFAULT_USER_SETTINGS.quietHoursEnabled,
    quietStart: (row.quietStart as string | undefined) ?? DEFAULT_USER_SETTINGS.quietStart,
    quietEnd: (row.quietEnd as string | undefined) ?? DEFAULT_USER_SETTINGS.quietEnd,
    defaultStartRoute: (row.defaultStartRoute as string | undefined) ?? DEFAULT_USER_SETTINGS.defaultStartRoute,
    weatherCity: (row.weatherCity as UserSettingsData["weatherCity"]) ?? DEFAULT_USER_SETTINGS.weatherCity,
    starRoamEnabled: (row.starRoamEnabled as boolean | undefined) ?? DEFAULT_USER_SETTINGS.starRoamEnabled,
    starPersonality: (row.starPersonality as UserSettingsData["starPersonality"]) ?? DEFAULT_USER_SETTINGS.starPersonality,
    starSoundEnabled: (row.starSoundEnabled as boolean | undefined) ?? DEFAULT_USER_SETTINGS.starSoundEnabled,
  };
}

export async function getUserSettings(userId: string): Promise<UserSettingsData> {
  const row = await settingsRepository.findByUserId(userId);
  return toSettingsData(row);
}

export async function updateUserSettings(userId: string, input: UpdateSettingsInput): Promise<UserSettingsData> {
  const row = await settingsRepository.upsert(userId, input);
  return toSettingsData(row);
}
