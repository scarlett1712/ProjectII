"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MealManagementTab } from "@/features/nutrition/presentation/components/MealManagementTab";
import { WaterReminderTab } from "@/features/water/presentation/components/WaterReminderTab";
import { OnboardingTour, TourStep } from "@/shared/ui/OnboardingTour";
import { useTranslations } from "next-intl";
import { SegmentedControl } from "@/shared/ui/components";

type NutritionTranslator = ReturnType<typeof useTranslations<"nutrition">>;
type CommonTranslator = ReturnType<typeof useTranslations<"common">>;

const buildMealTourSteps = (t: NutritionTranslator): TourStep[] => [
  {
    selector: "#tour-nutrition-tabs",
    title: t("tour.tabs.title"),
    content: t("tour.tabs.content"),
  },
  {
    selector: "#tour-meal-views",
    title: t("tour.mealViews.title"),
    content: t("tour.mealViews.content"),
  },
  {
    selector: "#tour-meal-week-picker",
    title: t("tour.mealWeekPicker.title"),
    content: t("tour.mealWeekPicker.content"),
  },
  {
    selector: "#tour-meal-progress",
    title: t("tour.mealProgress.title"),
    content: t("tour.mealProgress.content"),
  },
  {
    selector: "#tour-meal-add-btn",
    title: t("tour.mealAdd.title"),
    content: t("tour.mealAdd.content"),
  }
];

const buildWaterTourSteps = (t: NutritionTranslator, tc: CommonTranslator): TourStep[] => [
  {
    selector: "#tour-nutrition-tabs",
    title: t("tour.tabs.title"),
    content: t("tour.tabs.content"),
  },
  {
    selector: "#tour-water-chart-box",
    title: t("tour.waterChart.title"),
    content: t("tour.waterChart.content"),
  },
  {
    selector: "#tour-water-quick-log",
    title: t("tour.waterQuickLog.title"),
    content: t("tour.waterQuickLog.content"),
  },
  {
    selector: "#tour-water-slots",
    title: tc("water.reminderSlots"),
    content: t("tour.waterSlots.content"),
  }
];

function NutritionTabsContent() {
  const t = useTranslations("nutrition");
  const tc = useTranslations("common");
  // Keep the steps reference stable because OnboardingTour reruns its effect when steps changes.
  const mealTourSteps = useMemo(() => buildMealTourSteps(t), [t]);
  const waterTourSteps = useMemo(() => buildWaterTourSteps(t, tc), [t, tc]);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"meal" | "water">("meal");

  useEffect(() => {
    if (tabParam === "water" || tabParam === "meal") {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Tab Selector */}
      <div id="tour-nutrition-tabs" className="mx-auto mb-6 w-full max-w-sm">
        <SegmentedControl
          options={[
            { value: "meal", label: <>🍽️ {t("screen.mealTab")}</> },
            { value: "water", label: <>💧 {t("screen.waterTab")}</> },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab Contents */}
      <div className="space-y-4 bg-white/90 p-5 sm:p-8 rounded-4xl border border-white/40 shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
          <span className="text-2xl">{activeTab === "meal" ? "🍽️" : "💧"}</span>
          <h2 className="text-xl font-bold text-gray-800">
            {activeTab === "meal" ? t("screen.mealHeading") : t("screen.waterHeading")}
          </h2>
        </div>
        {activeTab === "meal" ? <MealManagementTab /> : <WaterReminderTab />}
      </div>

      {activeTab === "meal" ? (
        <OnboardingTour pageKey="nutrition-meal" steps={mealTourSteps} />
      ) : (
        <OnboardingTour pageKey="nutrition-water" steps={waterTourSteps} />
      )}
    </div>
  );
}

export default function NutritionScreen() {
  const tc = useTranslations("common");
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">{tc("action.loading")}</div>}>
      <NutritionTabsContent />
    </Suspense>
  );
}
