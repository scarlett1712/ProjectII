"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { API_ROUTES } from "@/shared/config/routes";
import { apiRequest } from "@/shared/client/api";
import { DEFAULT_USER_SETTINGS, type FontSizeScale, type UserSettingsData } from "@/shared/domain/settings";

const STORAGE_KEY = "star-user-settings";

const FONT_PX: Record<FontSizeScale, string> = {
  sm: "14px",
  md: "16px",
  lg: "18px",
};

function applyDomPreferences(settings: UserSettingsData) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", settings.theme === "dark");
  root.style.fontSize = FONT_PX[settings.fontSize] ?? FONT_PX.md;
}

function readCachedSettings(): UserSettingsData {
  if (typeof window === "undefined") return DEFAULT_USER_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    return { ...DEFAULT_USER_SETTINGS, ...(JSON.parse(raw) as Partial<UserSettingsData>) };
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

interface SettingsContextValue {
  settings: UserSettingsData;
  loading: boolean;
  updateSettings: (patch: Partial<UserSettingsData>) => Promise<UserSettingsData>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_USER_SETTINGS,
  loading: false,
  updateSettings: async (patch) => ({ ...DEFAULT_USER_SETTINGS, ...patch }),
});

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettingsData>(() => readCachedSettings());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyDomPreferences(settings);
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<UserSettingsData>(API_ROUTES.settings)
      .then((remote) => {
        if (cancelled) return;
        const merged = { ...DEFAULT_USER_SETTINGS, ...remote };
        setSettings(merged);
        applyDomPreferences(merged);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {}
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(async (patch: Partial<UserSettingsData>) => {
    const optimistic = { ...settings, ...patch };
    setSettings(optimistic);
    applyDomPreferences(optimistic);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(optimistic));
    } catch {}

    const saved = await apiRequest<UserSettingsData>(API_ROUTES.settings, {
      method: "PATCH",
      body: patch,
    });
    const merged = { ...DEFAULT_USER_SETTINGS, ...saved };
    setSettings(merged);
    applyDomPreferences(merged);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
    return merged;
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useUserSettings() {
  return useContext(SettingsContext);
}
