import { Wallet, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Category, Transaction } from "@/features/budget/presentation/types";
import { categoryBudgetRows } from "@/features/budget/domain/categoryBudget";
import { cashflowByKey, dayKey, monthKey } from "@/features/budget/domain/cashflow";
import { endOfMonth, startOfDay, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { colors } from "@/shared/theme/tokens";
import { SegmentedControl } from "@/shared/ui/components";
import { formatDayMonth, formatVND } from "@/shared/i18n/format";
import { useTranslations } from "next-intl";

interface BudgetReportsProps {
  reportRange: "week" | "month" | "year";
  setReportRange: (range: "week" | "month" | "year") => void;
  currentYear: number;
  currentMonth: number;
  transactions: Transaction[];
  yearTransactions: Transaction[];
  expenseCategoriesData: ReturnType<typeof categoryBudgetRows<Category>>;
  totalIncomeActual: number;
  totalExpenseActual: number;
}

export function BudgetReports({
  reportRange,
  setReportRange,
  currentYear,
  currentMonth,
  transactions,
  yearTransactions,
  expenseCategoriesData,
  totalIncomeActual,
  totalExpenseActual,
}: BudgetReportsProps) {
  const tBudget = useTranslations("budget");
  const tc = useTranslations("common");
  // Chart data formatting
  // Group transactions for Bar Chart (Income vs Expense)
  const getChartData = () => {
    if (reportRange === "year") {
      // Load the entire year's transactions separately for the annual report.
      const keys = Array.from({ length: 12 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, "0")}`);
      return cashflowByKey(yearTransactions, keys, monthKey).map((m, i) => ({
        name: tBudget("reports.monthLabel", { month: String(i + 1) }),
        income: m.income,
        expense: m.expense,
      }));
    }

    let txs = transactions;
    if (reportRange === "week") {
      // The most recent seven days of the selected month, ending today for the current month.
      const today = new Date();
      const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth;
      const end = isCurrentMonth ? today : endOfMonth(new Date(currentYear, currentMonth - 1));
      const start = startOfDay(subDays(end, 6));
      txs = txs.filter((tx) => {
        const at = new Date(tx.occurredAt);
        return at >= start && at <= end;
      });
    }
    const keys = [...new Set(txs.map((tx) => dayKey(tx.occurredAt)))].sort();
    return cashflowByKey(txs, keys, dayKey).map((d) => ({
      name: formatDayMonth(new Date(`${d.key}T00:00`)),
      income: d.income,
      expense: d.expense,
    }));
  };

  // Get Pie Chart data
  const getPieData = () => {
    const data = expenseCategoriesData
      .filter((c) => c.actual > 0)
      .map((c) => ({
        name: c.name,
        value: c.actual,
        color: c.color,
      }));
    return data.length > 0 ? data : [{ name: tBudget("reports.pieEmpty"), value: 1, color: colors.line }];
  };
  const pieData = getPieData();
  const statCards = [
    {
      labelKey: "reports.totalIncomeActual",
      Icon: TrendingUp,
      iconTone: "bg-emerald-50 text-emerald-500",
      valueTone: "text-emerald-600",
      value: formatVND(totalIncomeActual),
    },
    {
      labelKey: "reports.totalExpenseActual",
      Icon: TrendingDown,
      iconTone: "bg-red-50 text-red-500",
      valueTone: "text-red-500",
      value: formatVND(totalExpenseActual),
    },
    {
      labelKey: "reports.surplusRate",
      Icon: Wallet,
      iconTone: "bg-purple-50 text-primary",
      valueTone: "text-primary-ink",
      value: totalIncomeActual > 0 ? `${Math.round(((totalIncomeActual - totalExpenseActual) / totalIncomeActual) * 100)}%` : "0%",
    },
  ] as const;
  return (
    <motion.div
      key="reports"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* Reports settings header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-purple-950 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          {tBudget("reports.title")}
        </h3>
        <SegmentedControl
          options={[
            { value: "week", label: tc("period.week") },
            { value: "month", label: tc("period.month") },
            { value: "year", label: tc("period.year") },
          ]}
          value={reportRange}
          onChange={setReportRange}
          size="sm"
          className="w-56"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.labelKey} className="bg-white p-5 rounded-3xl border border-purple-50 shadow-sm flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${card.iconTone}`}>
              <card.Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xs font-bold text-gray-400 uppercase">{tBudget(card.labelKey)}</p>
              <p className={`text-xl font-black ${card.valueTone}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. Bar Chart (Comparison) */}
        <div className="lg:col-span-8 bg-white rounded-4xl p-6 shadow-sm border border-purple-50">
          <h4 className="text-sm font-black text-purple-950 mb-6">{tBudget("reports.barChartTitle")}</h4>
          <div className="h-80 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.surfaceMuted} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: colors.inkMuted }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: colors.inkMuted }} />
                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                <Legend iconType="circle" />
                <Bar name={tc("finance.income")} dataKey="income" fill={colors.success} radius={[4, 4, 0, 0]} />
                <Bar name={tBudget("reports.barExpense")} dataKey="expense" fill={colors.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Pie Chart (Breakdown) */}
        <div className="lg:col-span-4 bg-white rounded-4xl p-6 shadow-sm border border-purple-50 flex flex-col justify-between">
          <h4 className="text-sm font-black text-purple-950 mb-2">{tBudget("reports.pieChartTitle")}</h4>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatVND(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart Legend */}
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {expenseCategoriesData.filter(c => c.actual > 0).map((cat) => (
              <div key={cat.id} className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span>{cat.name}</span>
                </div>
                <span className="text-purple-950">{formatVND(cat.actual)}</span>
              </div>
            ))}
            {expenseCategoriesData.filter(c => c.actual > 0).length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4 font-semibold">{tBudget("reports.noExpenses")}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
