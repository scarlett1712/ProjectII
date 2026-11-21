import { useTranslations } from "next-intl";
import { colors } from "@/shared/theme/tokens";

interface EnergyWaterCardProps {
  totalCalories: number;
  caloriePercent: number;
  totalWater: number;
  waterPercent: number;
  logWaterQuick: (amount: number) => void;
}

export function EnergyWaterCard({
  totalCalories,
  caloriePercent,
  totalWater,
  waterPercent,
  logWaterQuick,
}: EnergyWaterCardProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  return (
    <div className="col-span-1 xl:col-span-4">
      <section id="tour-energy-water" className="min-h-full rounded-4xl bg-white p-5 sm:p-6 shadow-sm overflow-hidden flex flex-col justify-between">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary">{t("energyWater.title")}</h2>
        </div>
        <div className="flex items-center justify-around sm:justify-center gap-2 sm:gap-4 md:gap-6 flex-wrap sm:flex-nowrap">
          {/* Calories Chart */}
          <div className="flex flex-col items-center">
            <p className="mb-3 text-2xs font-bold text-ink-secondary uppercase tracking-wider">{t("energyWater.calories")}</p>
            <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="48" stroke={colors.primarySoft} strokeWidth="8" fill="transparent" />
                <circle cx="56" cy="56" r="48" stroke={colors.primary} strokeWidth="8" fill="transparent"
                  strokeDasharray={301} strokeDashoffset={301 - (301 * caloriePercent) / 100} strokeLinecap="round" />
              </svg>
              <div className="absolute text-center">
                <p className="text-lg sm:text-xl font-black text-primary-ink">{totalCalories}</p>
                <p className="text-4xs font-bold text-ink-secondary">{tc("unit.kcal")}</p>
              </div>
            </div>
          </div>

          {/* Water Chart */}
          <div className="flex flex-col items-center">
            <p className="mb-3 text-2xs font-bold text-ink-secondary uppercase tracking-wider">{t("energyWater.water")}</p>
            <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="48" stroke={colors.waterSoft} strokeWidth="8" fill="transparent" />
                <circle cx="56" cy="56" r="48" stroke={colors.waterRing} strokeWidth="8" fill="transparent"
                  strokeDasharray={301} strokeDashoffset={301 - (301 * waterPercent) / 100} strokeLinecap="round" />
              </svg>
              <div className="absolute text-center">
                <p className="text-lg sm:text-xl font-black text-water-strong">{totalWater}</p>
                <p className="text-4xs font-bold text-ink-secondary">{tc("unit.ml")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 grid w-full grid-cols-3 gap-1.5 sm:gap-2">
          <button
            onClick={() => logWaterQuick(150)}
            className="rounded-2xl bg-water-soft p-2 sm:p-3 text-center transition-all hover:scale-[1.05] hover:bg-water-muted active:scale-[0.95]"
          >
            <p className="text-base sm:text-lg font-black text-water-strong">{t("energyWater.addWater", { amountMl: "150" })}</p>
            <p className="text-3xs sm:text-2xs font-bold text-water truncate">{t("energyWater.smallCup")}</p>
          </button>
          <button
            onClick={() => logWaterQuick(250)}
            className="rounded-2xl bg-water-soft p-2 sm:p-3 text-center transition-all hover:scale-[1.05] hover:bg-water-muted active:scale-[0.95]"
          >
            <p className="text-base sm:text-lg font-black text-water-strong">{t("energyWater.addWater", { amountMl: "250" })}</p>
            <p className="text-3xs sm:text-2xs font-bold text-water truncate">{t("energyWater.mediumCup")}</p>
          </button>
          <button
            onClick={() => logWaterQuick(500)}
            className="rounded-2xl bg-water-soft p-2 sm:p-3 text-center transition-all hover:scale-[1.05] hover:bg-water-muted active:scale-[0.95]"
          >
            <p className="text-base sm:text-lg font-black text-water-strong">{t("energyWater.addWater", { amountMl: "500" })}</p>
            <p className="text-3xs sm:text-2xs font-bold text-water truncate">{t("energyWater.largeBottle")}</p>
          </button>
        </div>
      </section>
    </div>
  );
}
