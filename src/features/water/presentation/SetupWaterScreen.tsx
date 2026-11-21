"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useRequireAuth } from "@/shared/client/hooks";
import { markNewSignup } from "@/shared/client/onboarding";
import { StarBackground } from "@/shared/ui/StarBackground";
import { DraggableStar } from "@/shared/ui/mascot/DraggableStar";
import { colors } from "@/shared/theme/tokens";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button, FieldLabel, Spinner, TextInput } from "@/shared/ui/components";
import { API_ROUTES, ROUTES } from "@/shared/config/routes";
import { DEFAULT_DAILY_WATER_ML } from "@/shared/domain/healthDefaults";

const DEFAULT_SLOTS = ["07:00", "09:00", "11:00", "13:30", "15:30", "17:30", "18:30", "20:00"];

export default function SetupWaterScreen() {
  const t = useTranslations("water");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: session, status } = useRequireAuth();
  const userEmail = session?.user?.email || "";

  const [target, setTarget] = useState(String(DEFAULT_DAILY_WATER_ML));
  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [newSlot, setNewSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  useEffect(() => {
    fetch(API_ROUTES.profile)
      .then((res) => res.json())
      .then((profile) => {
        if (profile && profile.weightKg) {
          const suggestedWater = Math.round(profile.weightKg * 35);
          setTarget(String(suggestedWater));
          
          // Generate realistic slots from 7 AM to 9 PM, every 2-3 hours depending on water
          const numSlots = Math.max(4, Math.min(10, Math.round(suggestedWater / 250)));
          const startHour = 7;
          const endHour = 21;
          const interval = (endHour - startHour) / (numSlots - 1);
          
          const newSlots = Array.from({ length: numSlots }).map((_, i) => {
            const h = Math.round(startHour + i * interval);
            const m = (h % 1) >= 0.5 ? 30 : 0;
            return `${String(Math.floor(h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          });
          
          setSlots([...new Set(newSlots)].sort()); // unique and sort
          setAiMessage(t("setup.aiSuggestion", { weightKg: String(profile.weightKg), suggestedMl: String(suggestedWater) }));
        }
      })
      .catch(() => undefined);
  }, [t]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-soft">
        <div className="text-center animate-pulse">
          <Spinner className="mx-auto h-12 w-12 text-primary" />
          <p className="mt-4 text-primary font-black">{tc("action.loading")}</p>
        </div>
      </div>
    );
  }

  function addSlot() {
    const t = newSlot.trim();
    if (t && !slots.includes(t)) {
      setSlots((prev) => [...prev, t].sort());
      setNewSlot("");
    }
  }

  function removeSlot(s: string) {
    setSlots((prev) => prev.filter((v) => v !== s));
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await fetch(API_ROUTES.water, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "goal", dailyTargetMl: Number(target), slots }),
      });
      markNewSignup(userEmail);
      router.push(ROUTES.dashboard);
    } finally {
      setLoading(false);
    }
  }

  return (
    <StarBackground>
      <div className="flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-[500px] rounded-panel bg-white p-8 shadow-card relative overflow-hidden">
          {/* Glass icon */}
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" viewBox="0 0 64 64" fill="none">
              <path d="M18 8h28l-4 48H22L18 8z" fill={colors.primary} opacity="0.15" stroke={colors.primary} strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M22 32h20" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
              <path d="M21 24h22" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
              <rect x="18" y="4" width="28" height="6" rx="2" fill={colors.primary} opacity="0.3" />
            </svg>
          </div>

          <h1 className="mb-2 text-center text-2xl font-bold text-primary">{t("setup.title")}</h1>
          <p className="mb-4 text-center text-sm text-ink-subtle">
            {t("setup.subtitle")}
          </p>

          {aiMessage && (
            <div className="mb-6 rounded-xl bg-purple-50 p-4 border border-purple-100 flex gap-3 items-start duration-500">
              <div className="bg-purple-200 text-purple-600 rounded-full p-2 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-sm text-purple-700 leading-relaxed font-medium">
                {aiMessage}
              </p>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <FieldLabel htmlFor="target">{t("setup.targetLabel")}</FieldLabel>
              <div className="relative">
                <TextInput id="target" type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="pr-12" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-primary">{tc("unit.ml")}</span>
              </div>
            </div>

            <div>
              <FieldLabel>{t("setup.slotsLabel")}</FieldLabel>
              <div className="flex flex-wrap gap-2 rounded-xl border border-primary-line bg-primary-subtle p-4">
                {slots.map((s) => (
                  <button key={s} type="button" onClick={() => removeSlot(s)}
                    className="rounded-lg border border-primary-line-strong bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-red-50 hover:border-red-300 hover:text-red-500 shadow-sm flex items-center gap-1 group">
                    {s}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ))}
                <div className="flex items-center gap-2 mt-1">
                  <input type="time" value={newSlot} onChange={(e) => setNewSlot(e.target.value)}
                    className="rounded-lg border border-primary-line-strong bg-white px-3 py-1.5 text-sm font-bold text-gray-900 outline-none shadow-sm" />
                  <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={addSlot}>
                    {tc("action.add")}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => {
              markNewSignup(userEmail);
              router.push(ROUTES.dashboard);
            }}>
              {t("setup.later")}
            </Button>
            <Button size="lg" className="flex-1" onClick={handleSubmit} loading={loading} loadingText={tc("action.savingEllipsis")}>
              {t("setup.submit")}
            </Button>
          </div>
        </div>
      </div>
      <DraggableStar />
    </StarBackground>
  );
}
