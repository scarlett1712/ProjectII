import { Wallet, Plus, Pencil } from "lucide-react";
import { TagPill } from "@/features/budget/presentation/components/TagPill";
import { Account } from "@/features/budget/presentation/types";
import { sumCashflow } from "@/features/budget/domain/cashflow";
import { colors } from "@/shared/theme/tokens";
import { IconButton } from "@/shared/ui/components";
import { formatVND } from "@/shared/i18n/format";
import { useTranslations } from "next-intl";

interface AccountsTableProps {
  processedAccounts: (Account & { starting: number; ending: number; incoming: number; outgoing: number })[];
  totalStarting: number;
  monthCashflow: ReturnType<typeof sumCashflow>;
  onAdd: () => void;
  onEdit: (account: Account) => void;
}

export function AccountsTable({
  processedAccounts,
  totalStarting,
  monthCashflow,
  onAdd,
  onEdit,
}: AccountsTableProps) {
  const tBudget = useTranslations("budget");
  const totalEnding = processedAccounts.reduce((sum, a) => sum + a.ending, 0);
  return (
    <div className="lg:col-span-7 bg-white rounded-4xl p-6 shadow-sm border border-purple-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-black text-purple-950 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          {tBudget("accounts.title")}
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-caption font-black text-primary bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full transition-all"
        >
          <Plus className="h-3 w-3" /> {tBudget("accounts.add")}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-purple-50 text-2xs font-black text-gray-400 uppercase tracking-wider">
              <th className="py-2.5">{tBudget("accounts.columnAccount")}</th>
              <th className="py-2.5 text-right">{tBudget("accounts.columnStarting")}</th>
              <th className="py-2.5 text-right text-emerald-600">{tBudget("accounts.columnIn")}</th>
              <th className="py-2.5 text-right text-red-600">{tBudget("accounts.columnOut")}</th>
              <th className="py-2.5 text-right text-purple-950">{tBudget("accounts.columnBalance")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-50/50 text-xs font-semibold text-gray-700">
            {processedAccounts.map((acc) => (
              <tr key={acc.id} className="hover:bg-purple-50/20 transition-colors">
                <td className="py-2.5 font-bold text-gray-900 flex items-center gap-1.5 group/cell">
                  <TagPill name={acc.name} color={acc.color || colors.primary} />
                  <IconButton
                    label={tBudget("accounts.edit")}
                    className="opacity-0 group-hover/cell:opacity-100 focus-visible:opacity-100"
                    onClick={() => onEdit(acc)}
                  >
                    <Pencil className="h-3 w-3" />
                  </IconButton>
                </td>
                <td className="py-2.5 text-right text-gray-500">{formatVND(acc.starting)}</td>
                <td className="py-2.5 text-right text-emerald-600">+{formatVND(acc.incoming)}</td>
                <td className="py-2.5 text-right text-red-500">-{formatVND(acc.outgoing)}</td>
                <td className="py-2.5 text-right font-black text-purple-950">{formatVND(acc.ending)}</td>
              </tr>
            ))}
            {processedAccounts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                  {tBudget("accounts.empty")}
                </td>
              </tr>
            )}
          </tbody>
          {processedAccounts.length > 0 && (
            <tfoot>
              <tr className="border-t border-purple-100 font-black text-xs text-purple-950">
                <td className="py-3">{tBudget("accounts.total")}</td>
                <td className="py-3 text-right">{formatVND(totalStarting)}</td>
                <td className="py-3 text-right text-emerald-600">+{formatVND(monthCashflow.income)}</td>
                <td className="py-3 text-right text-red-500">-{formatVND(monthCashflow.expense)}</td>
                <td className="py-3 text-right text-purple-950">{formatVND(totalEnding)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
