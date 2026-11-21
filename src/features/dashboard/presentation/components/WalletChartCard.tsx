import { useTranslations } from "next-intl";
import { formatCurrency } from "@/shared/i18n/format";
import { SegmentedControl } from "@/shared/ui/components";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { colors } from "@/shared/theme/tokens";
import type { useDashboardData } from "@/features/dashboard/presentation/useDashboardData";

interface WalletChartCardProps {
  walletChartView: "day" | "month" | "year";
  onViewChange: (view: "day" | "month" | "year") => void;
  walletData: ReturnType<typeof useDashboardData>["walletData"];
}

export function WalletChartCard({ walletChartView, onViewChange, walletData }: WalletChartCardProps) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  return (
    <div className="col-span-1 xl:col-span-8">
      <section id="tour-wallet-chart" className="h-full rounded-4xl bg-white p-5 sm:p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary">{t("wallet.title")}</h2>
          <SegmentedControl
            size="sm"
            className="w-48"
            ariaLabel={t("wallet.title")}
            options={[
              { value: "day", label: tc("period.day") },
              { value: "month", label: tc("period.month") },
              { value: "year", label: tc("period.year") },
            ]}
            value={walletChartView}
            onChange={onViewChange}
          />
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={walletData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.success} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.success} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.danger} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.danger} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.surfaceMuted} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: colors.inkMuted, fontSize: 12 }} dy={10} />
              <YAxis hide />
              <Tooltip
                formatter={(value: any, name: any) => [formatCurrency(Number(value) || 0), name === 'income' ? tc("finance.income") : tc("finance.expense")]}
                labelFormatter={(label) => t("wallet.tooltipLabel", { label })}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" name="income" dataKey="income" stroke={colors.success} strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
              <Area type="monotone" name="expense" dataKey="expense" stroke={colors.danger} strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
