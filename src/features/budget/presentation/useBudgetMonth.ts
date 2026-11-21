import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Account, Category, Goal, Transaction } from "@/features/budget/presentation/types";
import { fetchWithCache } from "@/shared/client/cacheSync";
import { apiErrorMessage, apiRequest, isAbortError } from "@/shared/client/api";
import { useToast } from "@/shared/ui/components";
import { useTranslations } from "next-intl";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { useDataSync, useLatestRequest } from "@/shared/client/hooks";

export function useBudgetMonth() {
  const tBudget = useTranslations("budget");
  const { data: session } = useSession();
  const userId = session?.user?.id;
  // Date state
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1); // 1-indexed

  // Data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // Report states
  const [reportRange, setReportRange] = useState<"week" | "month" | "year">("month");
  const [yearTransactions, setYearTransactions] = useState<Transaction[]>([]);
  const nextYearSignal = useLatestRequest();

  const toast = useToast();
  const nextMonthSignal = useLatestRequest();

  /** Load the selected month's data. Cancel superseded requests so a previous month's results cannot replace the current ones. */
  const fetchData = async () => {
    if (!userId) return;
    const signal = nextMonthSignal();
    const url = withQuery(API_ROUTES.budget.root, { year: currentYear, month: currentMonth });
    fetchWithCache<{ accounts?: Account[]; categories?: Category[]; goals?: Goal[]; transactions?: Transaction[] }>(
      url,
      { signal },
      {
        onData: (data) => {
          setAccounts(data.accounts || []);
          setCategories(data.categories || []);
          setGoals(data.goals || []);
          setTransactions(data.transactions || []);
          setLoading(false);
        },
      },
    ).catch((e) => {
      if (isAbortError(e)) return;
      toast.error(apiErrorMessage(e, tBudget("toast.loadFailed")));
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [userId, currentYear, currentMonth]);

  useDataSync(() => fetchData(), { domains: ["budget"] });

  // Load annual transactions while viewing the annual report and refresh them when the monthly data changes.
  useEffect(() => {
    if (reportRange !== "year" || !userId) return;
    const signal = nextYearSignal();
    apiRequest<Transaction[]>(withQuery(API_ROUTES.budget.transactions, { year: currentYear }), { signal })
      .then(setYearTransactions)
      .catch((e) => {
        if (!isAbortError(e)) toast.error(apiErrorMessage(e, tBudget("toast.loadFailed")));
      });
  }, [reportRange, currentYear, userId, transactions, nextYearSignal, toast, tBudget]);
  return { currentYear, setCurrentYear, currentMonth, setCurrentMonth, accounts, categories, goals, setGoals, transactions, loading, reportRange, setReportRange, yearTransactions, fetchData };
}
