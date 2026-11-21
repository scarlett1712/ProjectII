"use client";

import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import { Clock } from "lucide-react";
import type { Meal, MealCategoryDetails } from "./mealTypes";

interface MealTimeCardProps {
  meal: Meal;
  category: MealCategoryDetails;
  /** Week view uses narrow columns and smaller type. Day view adds weight and a time icon. */
  variant: "week" | "day";
  top: number;
  onOpen: () => void;
}

/** Meal card positioned at its logged time in the week or day grid. Click for details. */
export function MealTimeCard({ meal, category, variant, top, onOpen }: MealTimeCardProps) {
  const t = useTranslations("nutrition");
  const tc = useTranslations("common");
  const time = format(parseISO(meal.eatenAt), "HH:mm");
  const calories = meal.calories > 0 ? t("meal.unit.calories", { calories: String(meal.calories) }) : null;
  const isDay = variant === "day";

  return (
    <div
      onClick={(e) => {
        // Prevent the underlying hour cell from opening the new meal form.
        e.stopPropagation();
        onOpen();
      }}
      style={{
        top,
        height: 46,
        backgroundColor: category.fill,
        // Set border before borderLeft properties so the shorthand preserves the 4px left edge.
        border: `1px solid ${category.border}40`,
        borderLeftWidth: 4,
        borderLeftColor: category.border,
        zIndex: 10,
      }}
      className={`absolute flex cursor-pointer select-none flex-col justify-between overflow-hidden rounded-r-lg shadow-sm hover:brightness-95 ${
        isDay ? "left-2 right-2 p-1.5" : "left-0.5 right-0.5 p-1"
      }`}
    >
      {isDay ? (
        <>
          <span className="truncate text-xs font-black text-gray-800">
            {category.emoji} {meal.mealName} {meal.grams > 0 ? `(${t("meal.unit.grams", { grams: String(meal.grams) })})` : ""}
          </span>
          <div className="flex items-center justify-between text-2xs font-bold opacity-75">
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {time}
            </span>
            <span>{calories ?? tc("meal.optional")}</span>
          </div>
        </>
      ) : (
        <>
          <span className="truncate text-3xs font-black leading-tight text-gray-800">
            {category.emoji} {meal.mealName}
          </span>
          <div className="flex items-center justify-between text-4xs font-bold opacity-75">
            <span>{time}</span>
            {calories && <span>{calories}</span>}
          </div>
        </>
      )}
    </div>
  );
}
