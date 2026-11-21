import { useTranslations } from "next-intl";
import { Utensils, Wallet, Calendar } from "lucide-react";

interface QuickActionsProps {
  onMeal: () => void;
  onSchedule: () => void;
  onTransaction: () => void;
}

export function QuickActions({ onMeal, onSchedule, onTransaction }: QuickActionsProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{t("header.welcome")}</h2>
        <p className="text-xs text-gray-500">{t("header.subtitle")}</p>
      </div>
      <div id="tour-quick-actions" className="flex items-center gap-2 bg-white/60 p-2 rounded-2xl border border-white/20 shadow-sm self-start sm:self-auto">
        <span className="text-xs font-bold text-primary px-2">{t("header.quickLog")}</span>
        <button
          onClick={onMeal}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle text-primary transition-transform hover:scale-105 active:scale-95 shadow-sm"
          title={t("header.addMeal")}
        >
          <Utensils className="h-5 w-5" />
        </button>
        <button
          onClick={onSchedule}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-indigo-soft text-accent-indigo transition-transform hover:scale-105 active:scale-95 shadow-sm"
          title={t("header.addSchedule")}
        >
          <Calendar className="h-5 w-5" />
        </button>
        <button
          onClick={onTransaction}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-green-soft text-accent-green transition-transform hover:scale-105 active:scale-95 shadow-sm"
          title={tc("finance.addTransaction")}
        >
          <Wallet className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
