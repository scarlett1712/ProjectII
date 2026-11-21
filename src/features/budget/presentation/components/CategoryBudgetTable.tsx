"use client";

import { Pencil, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton, cn } from "@/shared/ui/components";
import { formatVND } from "@/shared/i18n/format";
import { colors } from "@/shared/theme/tokens";
import type { CategoryBudgetRow } from "../../domain/categoryBudget";
import type { Category } from "../types";
import { TagPill } from "./TagPill";

type Kind = Category["type"];

/** Presentation differences between income and expense tables, including colors, icons and labels. */
const KIND_STYLE = {
  INCOME: {
    Icon: TrendingUp,
    title: "text-emerald-900",
    icon: "text-emerald-500",
    addButton: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100",
    actual: "text-emerald-600",
    titleKey: "categoryTable.incomeTitle",
    columnKey: "categoryTable.columnIncome",
    emptyKey: "categoryTable.incomeEmpty",
    totalKey: "categoryTable.incomeTotal",
  },
  EXPENSE: {
    Icon: TrendingDown,
    title: "text-red-900",
    icon: "text-red-500",
    addButton: "text-red-600 bg-red-50 hover:bg-red-100",
    actual: "text-red-500",
    titleKey: "categoryTable.expenseTitle",
    columnKey: "categoryTable.columnExpense",
    emptyKey: "categoryTable.expenseEmpty",
    totalKey: "categoryTable.expenseTotal",
  },
} as const;

interface CategoryBudgetTableProps {
  kind: Kind;
  rows: readonly CategoryBudgetRow<Category>[];
  totals: { planned: number; actual: number };
  /** Change the key with the month so the uncontrolled target input starts with that month's value. */
  periodKey: string;
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
  onGoalBlur: (categoryId: string, value: string, previous: number) => void;
}

/** Monthly planned and actual amounts by income or expense category. */
export function CategoryBudgetTable({ kind, rows, totals, periodKey, onAddCategory, onEditCategory, onGoalBlur }: CategoryBudgetTableProps) {
  const t = useTranslations("budget");
  const style = KIND_STYLE[kind];
  // Income above target is favorable, while expenses above target are unfavorable. Prefix increases with a plus sign.
  const isGood = (diff: number) => (kind === "INCOME" ? diff >= 0 : diff <= 0);
  const signed = (diff: number) => `${(kind === "INCOME" ? diff >= 0 : diff > 0) ? "+" : ""}${formatVND(diff)}`;
  const totalDiff = totals.actual - totals.planned;

  return (
    <div className="bg-white rounded-4xl p-6 shadow-sm border border-purple-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn("text-base font-black flex items-center gap-2", style.title)}>
          <style.Icon className={cn("h-4.5 w-4.5", style.icon)} />
          {t(style.titleKey)}
        </h3>
        <button
          onClick={onAddCategory}
          className={cn("flex items-center gap-1 text-caption font-black px-3 py-1.5 rounded-full transition-all", style.addButton)}
        >
          <Plus className="h-3 w-3" /> {t("categoryTable.newCategory")}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-purple-50 text-2xs font-black text-gray-400 uppercase tracking-wider">
              <th className="py-2.5">{t(style.columnKey)}</th>
              <th className="py-2.5 text-right w-32">{t("categoryTable.columnPlanned")}</th>
              <th className="py-2.5 text-right">{t("categoryTable.columnActual")}</th>
              <th className="py-2.5 text-right">{t("categoryTable.columnDiff")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-50/50 text-xs font-semibold text-gray-700">
            {rows.map((cat) => (
              <tr key={cat.id} className="hover:bg-purple-50/20 transition-colors">
                <td className="py-2.5 font-bold text-gray-900 flex items-center gap-2 group/cell">
                  <TagPill name={cat.name} color={cat.color || colors.primary} />
                  <IconButton
                    label={t("categoryTable.editCategory")}
                    className="opacity-0 group-hover/cell:opacity-100 focus-visible:opacity-100"
                    onClick={() => onEditCategory(cat)}
                  >
                    <Pencil className="h-3 w-3" />
                  </IconButton>
                </td>
                <td className="py-2.5 text-right">
                  <input
                    key={`${cat.id}-${periodKey}`}
                    type="number"
                    defaultValue={cat.planned || ""}
                    placeholder={t("amountPlaceholder")}
                    onBlur={(e) => onGoalBlur(cat.id, e.target.value, cat.planned || 0)}
                    className="w-full rounded-lg bg-gray-50 border border-transparent px-2.5 py-1 text-right font-bold text-purple-950 focus:border-primary focus:bg-white outline-none"
                  />
                </td>
                <td className={cn("py-2.5 text-right font-bold", style.actual)}>{formatVND(cat.actual)}</td>
                <td className={cn("py-2.5 text-right font-black", isGood(cat.diff) ? "text-emerald-600" : "text-red-500")}>
                  {signed(cat.diff)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">
                  {t(style.emptyKey)}
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-purple-100 font-black text-xs text-purple-950">
                <td className="py-3">{t(style.totalKey)}</td>
                <td className="py-3 text-right pr-2">{formatVND(totals.planned)}</td>
                <td className={cn("py-3 text-right", style.actual)}>{formatVND(totals.actual)}</td>
                <td className={cn("py-3 text-right", isGood(totalDiff) ? "text-emerald-600" : "text-red-500")}>{signed(totalDiff)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
