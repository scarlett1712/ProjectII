"use client";

import { useState } from "react";
import { Bell, BellOff, Moon, Shield, Sparkles, Sun, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/shared/config/routes";
import { apiErrorMessage } from "@/shared/client/api";
import { useUserSettings } from "@/shared/client/settingsContext";
import { STAR_PERSONALITIES, type FontSizeScale, type StarPersonality, type ThemeMode, type WeatherCity } from "@/features/settings/domain/settingsTypes";
import { Button, SegmentedControl, useToast } from "@/shared/ui/components";

export default function SettingsScreen() {
  const t = useTranslations("settings");
  const tNav = useTranslations("shell.nav");
  const tc = useTranslations("common");
  const toast = useToast();
  const { settings, updateSettings } = useUserSettings();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const patch = async (key: string, values: Partial<typeof settings>) => {
    setSavingKey(key);
    try {
      await updateSettings(values);
      toast.success(t("saved"));
    } catch (err) {
      toast.error(apiErrorMessage(err, t("saveFailed")));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      {/* Header */}
      <div className="rounded-4xl border border-white/40 bg-white/95 p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-800">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      {/* System Settings */}
      <section className="rounded-4xl border border-white/40 bg-white/95 p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-primary">{t("systemSection")}</h2>

        {/* Theme */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            {settings.theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
            <span className="text-sm font-bold text-gray-800">{t("themeLabel")}</span>
          </div>
          <SegmentedControl<ThemeMode>
            size="sm"
            className="w-48"
            options={[
              { value: "light", label: t("themeLight") },
              { value: "dark", label: t("themeDark") },
            ]}
            value={settings.theme}
            onChange={(theme) => void patch("theme", { theme })}
          />
        </div>

        {/* Font size */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <span className="text-sm font-bold text-gray-800">{t("fontSizeLabel")}</span>
          <SegmentedControl<FontSizeScale>
            size="sm"
            className="w-60"
            options={[
              { value: "sm", label: t("fontSmall") },
              { value: "md", label: t("fontMedium") },
              { value: "lg", label: t("fontLarge") },
            ]}
            value={settings.fontSize}
            onChange={(fontSize) => void patch("fontSize", { fontSize })}
          />
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-start gap-3">
            {settings.notificationsEnabled ? <Bell className="mt-0.5 h-5 w-5 text-primary" /> : <BellOff className="mt-0.5 h-5 w-5 text-gray-400" />}
            <div>
              <p className="text-sm font-bold text-gray-800">{t("notificationsLabel")}</p>
              <p className="text-xs text-gray-500">{t("notificationsHint")}</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            disabled={savingKey === "notifications"}
            onChange={(e) => void patch("notifications", { notificationsEnabled: e.target.checked })}
            className="h-5 w-5 accent-primary cursor-pointer"
          />
        </div>

        {/* Quiet Hours */}
        <div className="space-y-3 border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-800">{t("quietHoursLabel")}</p>
              <p className="text-xs text-gray-500">{t("quietHoursHint")}</p>
            </div>
            <input
              type="checkbox"
              checked={settings.quietHoursEnabled}
              onChange={(e) => void patch("quietHoursEnabled", { quietHoursEnabled: e.target.checked })}
              className="h-5 w-5 accent-primary cursor-pointer"
            />
          </div>
          {settings.quietHoursEnabled && (
            <div className="flex flex-wrap items-center gap-4 pl-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <span>{t("quietStart")}</span>
                <input
                  type="time"
                  value={settings.quietStart}
                  onChange={(e) => void patch("quietStart", { quietStart: e.target.value })}
                  className="rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <span>{t("quietEnd")}</span>
                <input
                  type="time"
                  value={settings.quietEnd}
                  onChange={(e) => void patch("quietEnd", { quietEnd: e.target.value })}
                  className="rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs"
                />
              </label>
            </div>
          )}
        </div>

        {/* Weather City */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <span className="text-sm font-bold text-gray-800">{t("weatherCityLabel")}</span>
          <select
            value={settings.weatherCity}
            onChange={(e) => void patch("weatherCity", { weatherCity: e.target.value as WeatherCity })}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700"
          >
            <option value="auto">{t("weatherAuto")}</option>
            <option value="hanoi">{t("weatherHanoi")}</option>
            <option value="hcm">{t("weatherHcm")}</option>
            <option value="danang">{t("weatherDanang")}</option>
          </select>
        </div>

        {/* Default Start Route */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm font-bold text-gray-800">{t("defaultStartLabel")}</span>
          <select
            value={settings.defaultStartRoute}
            onChange={(e) => void patch("defaultStartRoute", { defaultStartRoute: e.target.value })}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700"
          >
            <option value={ROUTES.dashboard}>{tNav("dashboard")}</option>
            <option value={ROUTES.diary}>{tNav("diary")}</option>
            <option value={ROUTES.nutrition}>{tNav("nutrition")}</option>
            <option value={ROUTES.calendar}>{tNav("calendar")}</option>
            <option value={ROUTES.budget}>{tNav("budget")}</option>
            <option value={ROUTES.chat}>{tNav("chat")}</option>
          </select>
        </div>
      </section>

      {/* Star Pet Settings */}
      <section className="rounded-4xl border border-white/40 bg-white/95 p-6 shadow-sm space-y-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
          <Sparkles className="h-5 w-5" />
          {t("starSection")}
        </h2>

        {/* Roaming */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <p className="text-sm font-bold text-gray-800">{t("starRoamLabel")}</p>
            <p className="text-xs text-gray-500">{t("starRoamHint")}</p>
          </div>
          <input
            type="checkbox"
            checked={settings.starRoamEnabled}
            onChange={(e) => void patch("starRoamEnabled", { starRoamEnabled: e.target.checked })}
            className="h-5 w-5 accent-primary cursor-pointer"
          />
        </div>

        {/* Sound */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-start gap-3">
            <Volume2 className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-bold text-gray-800">{t("starSoundLabel")}</p>
              <p className="text-xs text-gray-500">{t("starSoundHint")}</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.starSoundEnabled}
            onChange={(e) => void patch("starSoundEnabled", { starSoundEnabled: e.target.checked })}
            className="h-5 w-5 accent-primary cursor-pointer"
          />
        </div>

        {/* Personality */}
        <div className="space-y-3">
          <p className="text-sm font-bold text-gray-800">{t("starPersonalityLabel")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STAR_PERSONALITIES.map((p: StarPersonality) => {
              const active = settings.starPersonality === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => void patch("starPersonality", { starPersonality: p })}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-primary bg-primary-soft ring-2 ring-primary/30"
                      : "border-gray-100 bg-gray-50/70 hover:border-primary/40"
                  }`}
                >
                  <p className={`text-sm font-extrabold ${active ? "text-primary" : "text-gray-800"}`}>
                    {t(`personalities.${p}.name`)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{t(`personalities.${p}.desc`)}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Account section */}
      <section className="rounded-4xl border border-white/40 bg-white/95 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base font-bold text-gray-800">{t("accountSection")}</h2>
            <p className="text-xs text-gray-500">{t("accountHint")}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent("open-change-password"))}
        >
          {tc("auth.changePassword")}
        </Button>
      </section>
    </div>
  );
}
