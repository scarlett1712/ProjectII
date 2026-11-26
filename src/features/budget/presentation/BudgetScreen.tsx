"use client";

import { useBudgetEditor } from "./useBudgetEditor";
import { useMemo, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, ArrowRightLeft, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryBudgetTable } from "@/features/budget/presentation/components/CategoryBudgetTable";
import { TransactionLogTable } from "@/features/budget/presentation/components/TransactionLogTable";
import { Goal } from "@/features/budget/presentation/types";
import { runningBalances } from "@/features/budget/domain/runningBalances";
import { categoryBudgetRows, sumCategoryBudget } from "@/features/budget/domain/categoryBudget";
import { notifyDataChanged } from "@/shared/client/cacheSync";
import { apiErrorMessage, apiRequest } from "@/shared/client/api";
import { sumCashflow } from "@/features/budget/domain/cashflow";
import { IconButton, LinkedDeleteModal, SegmentedControl, Spinner, useConfirm, useToast } from "@/shared/ui/components";
import { useTranslations } from "next-intl";
import { API_ROUTES, withQuery } from "@/shared/config/routes";
import { useBudgetMonth } from "@/features/budget/presentation/useBudgetMonth";
import { CashFlowCard } from "@/features/budget/presentation/components/CashFlowCard";
import { AccountsTable } from "@/features/budget/presentation/components/AccountsTable";
import { BudgetReports } from "@/features/budget/presentation/components/BudgetReports";

/** Each quick action opens the transaction form with its corresponding type selected. */
const QUICK_ACTIONS = [
  {
    type: "EXPENSE",
    Icon: TrendingDown,
    tone: "from-red-50 to-red-100/50 border-red-100",
    label: "text-red-600",
    action: "text-red-950",
    icon: "text-red-500",
    titleKey: "quickActions.expenseTitle",
    actionKey: "quickActions.expenseAction",
  },
  {
    type: "INCOME",
    Icon: TrendingUp,
    tone: "from-emerald-50 to-emerald-100/50 border-emerald-100",
    label: "text-emerald-600",
    action: "text-emerald-950",
    icon: "text-emerald-500",
    titleKey: "quickActions.incomeTitle",
    actionKey: "quickActions.incomeAction",
  },
  {
    type: "TRANSFER",
    Icon: ArrowRightLeft,
    tone: "from-indigo-50 to-indigo-100/50 border-indigo-100",
    label: "text-indigo-600",
    action: "text-indigo-950",
    icon: "text-indigo-500",
    titleKey: "quickActions.transferTitle",
    actionKey: "quickActions.transferAction",
  },
] as const;

export default function BudgetScreen() {
  const tBudget = useTranslations("budget");
  const tCam = useTranslations("diary.camera");
  const tc = useTranslations("common");
  const [deletingTx, setDeletingTx] = useState<{ id: string; photoCount: number } | null>(null);
  // Active Tab
  const [activeTab, setActiveTab] = useState<"monthly" | "reports">("monthly");
  const { currentYear, setCurrentYear, currentMonth, setCurrentMonth, accounts, categories,
    goals, setGoals, transactions, loading, reportRange, setReportRange, yearTransactions, fetchData } = useBudgetMonth();
  const editor = useBudgetEditor({ fetchData, accounts, categories });
  const toast = useToast();
  const confirm = useConfirm();
  const showSuccess = (message: string) => toast.success(message, { icon: <TrendingUp className="h-5 w-5" /> });
  /** Save the target on blur only if the amount changed, avoiding redundant requests and notifications. */
  const handleGoalBlur = async (categoryId: string, amountStr: string, previous: number) => {
    const amount = amountStr === "" ? 0 : Number(amountStr);
    if (isNaN(amount) || amount < 0 || amount === previous) return;

    try {
      const updatedGoal = await apiRequest<Goal>(API_ROUTES.budget.goals, {
        method: "POST",
        body: { categoryId, amount, year: currentYear, month: currentMonth },
      });
      setGoals((prev) => {
        const index = prev.findIndex((g) => g.categoryId === categoryId);
        if (index > -1) {
          const next = [...prev];
          next[index] = updatedGoal;
          return next;
        }
        return [...prev, updatedGoal];
      });
      showSuccess(tBudget("toast.goalSaved"));
      notifyDataChanged("budget");
    } catch (e) {
      toast.error(apiErrorMessage(e, tBudget("toast.goalSaveFailed")));
    }
  };
  // Delete Transaction
  const executeDeleteTx = async (id: string, deletePhotos: boolean) => {
    try {
      const res = await fetch(withQuery(API_ROUTES.budget.transactions, { id, deletePhotos: deletePhotos ? "1" : undefined }), {
        method: "DELETE",
      });

      if (res.ok) {
        showSuccess(tBudget("toast.transactionDeleted"));
        notifyDataChanged("budget");
        if (deletePhotos) notifyDataChanged("diary");
        fetchData();
      } else {
        const body = await res.json();
        toast.error(body.error || tBudget("toast.transactionDeleteFailed"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTx = async (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    const photoCount = tx?._count?.diaryPhotos ?? 0;
    if (photoCount > 0) {
      setDeletingTx({ id, photoCount });
      return;
    }
    if (!(await confirm({ message: tBudget("confirm.deleteTransaction"), confirmLabel: tc("action.delete") }))) return;
    await executeDeleteTx(id, false);
  };
  // Process Accounts data for monthly overview
  /** Balance of the relevant account immediately after each transaction, shown in both transaction tables. */
  const balanceAfter = useMemo(() => runningBalances(accounts, transactions), [accounts, transactions]);

  const processedAccounts = accounts.map((acc) => {
    const inThisMonth = transactions
      .filter((t) => t.toAccountId === acc.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const outThisMonth = transactions
      .filter((t) => t.fromAccountId === acc.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const starting = acc.startingBalance !== undefined ? acc.startingBalance : (acc.balance - inThisMonth + outThisMonth);
    const ending = starting + inThisMonth - outThisMonth;

    return {
      ...acc,
      starting,
      ending,
      incoming: inThisMonth,
      outgoing: outThisMonth,
    };
  });

  const totalStarting = processedAccounts.reduce((sum, a) => sum + a.starting, 0);
  // Planned and actual income and expenses by category.
  const incomeCategoriesData = categoryBudgetRows(categories, transactions, goals, "INCOME");
  const expenseCategoriesData = categoryBudgetRows(categories, transactions, goals, "EXPENSE");
  const incomeTotals = sumCategoryBudget(incomeCategoriesData);
  const expenseTotals = sumCategoryBudget(expenseCategoriesData);
  // Monthly totals for the accounts table include transactions without a category.
  const monthCashflow = sumCashflow(transactions);
  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <SegmentedControl
          surface="white"
          options={[
            {
              value: "monthly",
              label: (
                <span className="flex items-center justify-center gap-2">
                  <Wallet className="h-4 w-4" />
                  {tBudget("screen.tabMonthly")}
                </span>
              ),
            },
            {
              value: "reports",
              label: (
                <span className="flex items-center justify-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {tBudget("screen.tabReports")}
                </span>
              ),
            },
          ]}
          value={activeTab}
          onChange={setActiveTab}
          className="w-full sm:w-96"
        />

        {/* Month Selector */}
        <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-purple-100 shadow-sm">
          <IconButton
            label={tBudget("screen.previousMonth")}
            onClick={() => {
              if (currentMonth === 1) {
                setCurrentMonth(12);
                setCurrentYear((y) => y - 1);
              } else {
                setCurrentMonth((m) => m - 1);
              }
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="text-sm font-black text-purple-950 uppercase">
            {tBudget("screen.monthLabel", { month: String(currentMonth), year: String(currentYear) })}
          </span>
          <IconButton
            label={tBudget("screen.nextMonth")}
            onClick={() => {
              if (currentMonth === 12) {
                setCurrentMonth(1);
                setCurrentYear((y) => y + 1);
              } else {
                setCurrentMonth((m) => m + 1);
              }
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center">
          <Spinner className="h-12 w-12 text-primary" />
          <p className="mt-4 text-primary font-black animate-pulse">{tBudget("screen.loading")}</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === "monthly" ? (
            <motion.div
              key="monthly"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Quick Actions Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {QUICK_ACTIONS.map((qa) => (
                  <button
                    key={qa.type}
                    onClick={() => editor.open({ type: "addTransaction", kind: qa.type })}
                    className={`group flex items-center justify-between p-5 rounded-3xl bg-gradient-to-r border hover:shadow-md transition-all active:scale-[0.98] text-left ${qa.tone}`}
                  >
                    <div>
                      <h3 className={`text-xs font-black uppercase tracking-wider ${qa.label}`}>{tBudget(qa.titleKey)}</h3>
                      <p className={`text-lg font-black mt-0.5 ${qa.action}`}>{tBudget(qa.actionKey)}</p>
                    </div>
                    <div className={`h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${qa.icon}`}>
                      <qa.Icon className="h-5 w-5" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Cash flow and accounts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Cash flow overview */}
                <CashFlowCard incomeTotals={incomeTotals} expenseTotals={expenseTotals} totalStarting={totalStarting} />
                <AccountsTable processedAccounts={processedAccounts} totalStarting={totalStarting} monthCashflow={monthCashflow}
                  onAdd={() => editor.open({ type: "addAccount" })} onEdit={(account) => editor.open({ type: "editAccount", account })} />
              </div>

              {/* Planned and actual income and expenses by category */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(["INCOME", "EXPENSE"] as const).map((kind) => (
                  <CategoryBudgetTable
                    key={kind}
                    kind={kind}
                    rows={kind === "INCOME" ? incomeCategoriesData : expenseCategoriesData}
                    totals={kind === "INCOME" ? incomeTotals : expenseTotals}
                    periodKey={`${currentYear}-${currentMonth}`}
                    onAddCategory={() => editor.open({ type: "addCategory", kind })}
                    onEditCategory={(category) => editor.open({ type: "editCategory", category })}
                    onGoalBlur={handleGoalBlur}
                  />
                ))}
              </div>

              {/* Detailed transaction logs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TransactionLogTable
                  variant="income"
                  transactions={transactions.filter((t) => t.type === "INCOME")}
                  balanceAfter={balanceAfter}
                  onEdit={(transaction) => editor.open({ type: "editTransaction", transaction })}
                  onDelete={handleDeleteTx}
                />
                <TransactionLogTable
                  variant="outgoing"
                  transactions={transactions.filter((t) => t.type === "EXPENSE" || t.type === "TRANSFER")}
                  balanceAfter={balanceAfter}
                  onEdit={(transaction) => editor.open({ type: "editTransaction", transaction })}
                  onDelete={handleDeleteTx}
                />
              </div>
            </motion.div>
          ) : (
            <BudgetReports key="reports" reportRange={reportRange} setReportRange={setReportRange}
              currentYear={currentYear} currentMonth={currentMonth} transactions={transactions}
              yearTransactions={yearTransactions} expenseCategoriesData={expenseCategoriesData}
              totalIncomeActual={incomeTotals.actual} totalExpenseActual={expenseTotals.actual} />
          )}
        </AnimatePresence>
      )}

      {editor.dialogs}

      <LinkedDeleteModal
        open={!!deletingTx}
        message={tBudget("confirm.deleteTransaction")}
        options={
          deletingTx
            ? [{ key: "photos", label: tCam("deleteLinkedPhotosOption", { count: String(deletingTx.photoCount) }) }]
            : []
        }
        onClose={() => setDeletingTx(null)}
        onConfirm={async (selected) => {
          if (!deletingTx) return;
          const targetId = deletingTx.id;
          setDeletingTx(null);
          await executeDeleteTx(targetId, selected.has("photos"));
        }}
      />
    </div>
  );
}
