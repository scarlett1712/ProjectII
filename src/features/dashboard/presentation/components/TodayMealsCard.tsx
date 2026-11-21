import { useTranslations } from "next-intl";
import { Utensils } from "lucide-react";
import { formatTime } from "@/shared/i18n/format";

interface TodayMealsCardProps {
  todayMeals: { id: string; mealName: string; eatenAt: string; calories: number }[];
}

export function TodayMealsCard({ todayMeals }: TodayMealsCardProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  return (

    <div className="col-span-1 xl:col-span-4">
      <section className="h-full rounded-4xl bg-white p-5 sm:p-8 shadow-sm min-h-[300px]">
        <h2 className="mb-6 text-xl font-bold text-primary">{t("meals.title")}</h2>
        <div className="space-y-4">
          {todayMeals.slice(0, 3).length > 0 ? todayMeals.slice(0, 3).map((meal) => (
            <div key={meal.id} className="flex items-center gap-4 rounded-2xl bg-primary-soft p-3 transition-transform hover:scale-[1.02]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary">
                <Utensils className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">{meal.mealName}</p>
                <p className="text-xs text-ink-muted">
                  {meal.eatenAt ? formatTime(meal.eatenAt) : ""}
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary">
                {meal.calories > 0 ? t("meals.calories", { kcal: String(meal.calories) }) : tc("meal.optional")}
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-10 text-ink-muted">
              <Utensils className="mb-2 h-8 w-8 opacity-20" />
              <p className="text-xs">{t("meals.empty")}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
