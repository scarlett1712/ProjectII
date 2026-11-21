import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { format, subDays, subMonths } from "date-fns";
import { apiRequest, isAbortError } from "@/shared/client/api";
import { cashflowByKey, dayKey, monthKey, type CashflowTransaction } from "@/features/budget/domain/cashflow";
import { formatDate } from "@/shared/i18n/format";
import { fetchWithCache } from "@/shared/client/cacheSync";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { useDataSync, useLatestRequest } from "@/shared/client/hooks";
import { applyTagOverrides, readTagOverrides } from "@/features/calendar/presentation/tagOverrides";
import type { Tag } from "@/features/calendar/presentation/types";
import type { Task } from "@/features/tasks/domain/taskSeries";

export type DashboardTask = Omit<Task, "dueAt" | "recurrenceEnd" | "createdAt"> & {
  dueAt: string | null;
  recurrenceEnd: string | null;
  createdAt: string;
};
export function useDashboardData() {
  const t = useTranslations("dashboard");
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [calendarTags, setCalendarTags] = useState<Tag[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [waterData, setWaterData] = useState<any>({ goal: null, logs: [] });
  const [walletData, setWalletData] = useState<{ name: string; income: number; expense: number; dateStr: string }[]>([]);
  const [walletChartView, setWalletChartView] = useState<"day" | "month" | "year">("day");

  const [budgetAccounts, setBudgetAccounts] = useState<any[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<any[]>([]);

  const fetchProfile = () => {
    fetchWithCache<typeof profile>(API_ROUTES.profile, undefined, { onData: setProfile }).catch(() => undefined);
  };

  const fetchWater = () => {
    fetchWithCache<typeof waterData>(API_ROUTES.water, undefined, { onData: setWaterData }).catch(() => undefined);
  };
  const fetchMeals = () => {
    fetchWithCache<typeof meals>(API_ROUTES.meals.root, undefined, { onData: setMeals }).catch(() => undefined);
  };

  const fetchTasks = () => {
    fetchWithCache<typeof tasks>(API_ROUTES.tasks, undefined, { onData: setTasks }).catch(() => undefined);
  };

  const fetchTags = () => {
    fetchWithCache<typeof calendarTags>(API_ROUTES.tags, undefined, {
      onData: (data) => setCalendarTags(applyTagOverrides(data, readTagOverrides())),
    }).catch(() => undefined);
  };

  const nextWalletSignal = useLatestRequest();

  /**
   * Wallet chart showing income and expenses over the last 7 days, 30 days or 12 months, grouped by local date.
   * Cancel older requests when switching ranges so stale results cannot overwrite the latest chart.
   */
  const fetchBudgetStats = (view = walletChartView) => {
    const signal = nextWalletSignal();
    const year = new Date().getFullYear();
    Promise.all([
      apiRequest<typeof budgetAccounts>(API_ROUTES.budget.accounts, { signal }),
      apiRequest<typeof budgetCategories>(API_ROUTES.budget.categories, { signal }),
      apiRequest<CashflowTransaction[]>(withQuery(API_ROUTES.budget.transactions, { year }), { signal }),
      apiRequest<CashflowTransaction[]>(withQuery(API_ROUTES.budget.transactions, { year: year - 1 }), { signal }),
    ])
      .then(([accs, cats, txsThisYear, txsLastYear]) => {
        setBudgetAccounts(accs);
        setBudgetCategories(cats);
        const txs = [...txsThisYear, ...txsLastYear];
        const today = new Date();

        if (view === "year") {
          const months = Array.from({ length: 12 }, (_, i) => subMonths(today, 11 - i));
          const totals = cashflowByKey(txs, months.map(monthKey), monthKey);
          setWalletData(
            months.map((d, i) => ({
              name: t("wallet.monthLabel", { month: format(d, "M") }),
              income: totals[i].income,
              expense: totals[i].expense,
              dateStr: totals[i].key,
            })),
          );
          return;
        }

        const dayCount = view === "day" ? 7 : 30;
        const days = Array.from({ length: dayCount }, (_, i) => subDays(today, dayCount - 1 - i));
        const totals = cashflowByKey(txs, days.map(dayKey), dayKey);
        setWalletData(
          days.map((d, i) => ({
            name: view === "day" ? formatDate(d, "E") : format(d, "dd/MM"),
            income: totals[i].income,
            expense: totals[i].expense,
            dateStr: totals[i].key,
          })),
        );
      })
      .catch((error) => {
        if (!isAbortError(error)) console.error(error);
      });
  };

  useEffect(() => {
    fetchTasks();
    fetchMeals();
    fetchProfile();
    fetchWater();
    fetchTags();
    fetchBudgetStats();
  }, []);

  const reloadAll = () => {
    fetchTasks();
    fetchMeals();
    fetchWater();
    fetchTags();
    fetchBudgetStats();
  };

  useDataSync(
    (domain) => {
      if (domain === "all") reloadAll();
      else if (domain === "water") fetchWater();
      else if (domain === "meals") fetchMeals();
      else if (domain === "tasks") fetchTasks();
      else if (domain === "budget") fetchBudgetStats();
      else if (domain === "calendar") { fetchTasks(); fetchTags(); }
      else if (domain === "tags") fetchTags();
    },
    {
      // Refresh all displayed data except tags when returning to the tab.
      onVisible: () => {
        fetchTasks();
        fetchMeals();
        fetchWater();
        fetchBudgetStats();
      },
    },
  );
  return { tasks, meals, profile, waterData, calendarTags, budgetAccounts, budgetCategories, walletData, walletChartView, setWalletChartView, fetchBudgetStats, fetchMeals, fetchWater, fetchTasks };
}
