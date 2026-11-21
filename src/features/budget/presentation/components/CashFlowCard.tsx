import { TrendingUp } from "lucide-react";
import { sumCategoryBudget } from "@/features/budget/domain/categoryBudget";
import { formatVND } from "@/shared/i18n/format";
import { useTranslations } from "next-intl";

interface CashFlowCardProps {
  incomeTotals: ReturnType<typeof sumCategoryBudget>;
  expenseTotals: ReturnType<typeof sumCategoryBudget>;
  totalStarting: number;
}

export function CashFlowCard({ incomeTotals, expenseTotals, totalStarting }: CashFlowCardProps) {
  const tBudget = useTranslations("budget");
  // Cash flow amounts
  const totalIncomePlanned = incomeTotals.planned;
  const totalIncomeActual = incomeTotals.actual;
  const totalExpensePlanned = expenseTotals.planned;
  const totalExpenseActual = expenseTotals.actual;

  // Savings equal income minus expenses.
  const totalSavingsPlanned = totalIncomePlanned - totalExpensePlanned;
  const totalSavingsActual = totalIncomeActual - totalExpenseActual;

  const remainingPlanned = totalStarting + totalIncomePlanned - totalExpensePlanned;
  const remainingActual = totalIncomeActual - totalExpenseActual; // Net cash flow of the month
  const cashFlowRows = [
    { labelKey: "cashFlow.moneyIn", tone: "text-emerald-600", planned: totalIncomePlanned, actual: totalIncomeActual },
    { labelKey: "cashFlow.moneyOut", tone: "text-red-600", planned: totalExpensePlanned, actual: totalExpenseActual },
    { labelKey: "cashFlow.savings", tone: "text-purple-600", planned: totalSavingsPlanned, actual: totalSavingsActual },
  ] as const;
  return (
    <div className="lg:col-span-5 bg-white rounded-4xl p-6 shadow-sm border border-purple-50 flex flex-col justify-between">
      <div>
        <h3 className="text-base font-black text-purple-950 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {tBudget("cashFlow.title")}
        </h3>
        <div className="space-y-3.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-500">{tBudget("cashFlow.startingMoney")}</span>
            <span className="font-bold text-gray-400">{tBudget("cashFlow.planned", { amount: formatVND(totalStarting) })}</span>
          </div>
          {cashFlowRows.map((row) => (
            <div key={row.labelKey} className="flex justify-between items-center text-xs">
              <span className={`font-bold ${row.tone}`}>{tBudget(row.labelKey)}</span>
              <div className="flex gap-4">
                <span className="font-semibold text-gray-400">{tBudget("cashFlow.planned", { amount: formatVND(row.planned) })}</span>
                <span className={`font-black ${row.tone}`}>{tBudget("cashFlow.actual", { amount: formatVND(row.actual) })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-purple-50 flex items-center justify-between">
        <div>
          <p className="text-2xs font-bold text-gray-400 uppercase">{tBudget("cashFlow.remainingPlanned")}</p>
          <p className="text-lg font-black text-purple-950">{formatVND(remainingPlanned)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xs font-bold text-emerald-500 uppercase">{tBudget("cashFlow.actualSurplus")}</p>
          <p className={`text-lg font-black ${remainingActual >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {remainingActual >= 0 ? "+" : ""}{formatVND(remainingActual)}
          </p>
        </div>
      </div>
    </div>
  );
}
