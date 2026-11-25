import { ROUTES } from "@/shared/config/routes";

export type ThemeMode = "light" | "dark";
export type FontSizeScale = "sm" | "md" | "lg";
export type WeatherCity = "auto" | "hanoi" | "hcm" | "danang";
export type StarPersonality = "cute" | "cool" | "tsundere" | "energetic" | "zen";

export interface UserSettingsData {
  theme: ThemeMode;
  fontSize: FontSizeScale;
  notificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  defaultStartRoute: string;
  weatherCity: WeatherCity;
  starRoamEnabled: boolean;
  starPersonality: StarPersonality;
  starSoundEnabled: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettingsData = {
  theme: "light",
  fontSize: "md",
  notificationsEnabled: true,
  quietHoursEnabled: false,
  quietStart: "23:00",
  quietEnd: "07:00",
  defaultStartRoute: ROUTES.dashboard,
  weatherCity: "auto",
  starRoamEnabled: true,
  starPersonality: "cute",
  starSoundEnabled: true,
};

export const STAR_PERSONALITIES: readonly StarPersonality[] = [
  "cute",
  "cool",
  "tsundere",
  "energetic",
  "zen",
];

export const WEATHER_CITY_COORDS: Record<Exclude<WeatherCity, "auto">, { lat: number; lon: number }> = {
  hanoi: { lat: 21.0285, lon: 105.8542 },
  hcm: { lat: 10.8231, lon: 106.6297 },
  danang: { lat: 16.0544, lon: 108.2022 },
};

/** Check whether a given time falls within the user's configured quiet hours (handles overnight spans like 23:00-07:00). */
export function isWithinQuietHours(
  settings: Pick<UserSettingsData, "quietHoursEnabled" | "quietStart" | "quietEnd">,
  now: Date = new Date(),
): boolean {
  if (!settings.quietHoursEnabled) return false;
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };
  const current = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(settings.quietStart);
  const end = toMinutes(settings.quietEnd);
  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}
