"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Wallet,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Calendar,
  BarChart3,
  PieChart as PieIcon,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  HelpCircle,
  AlertCircle,
  Check,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  Cell
} from "recharts";

type Account = {
  id: string;
  name: string;
  balance: number;
};

type Category = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};

type Goal = {
  id: string;
  categoryId: string;
  amount: number;
  year: number;
  month: number;
};

type Transaction = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  categoryId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  note: string | null;
  occurredAt: string;
  category?: Category | null;
  fromAccount?: Account | null;
  toAccount?: Account | null;
};

export default function BudgetPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Active Tab
  const [activeTab, setActiveTab] = useState<"monthly" | "reports">("monthly");

  // Date state
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1); // 1-indexed

  // Data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showLogTransaction, setShowLogTransaction] = useState(false);
  const [transactionType, setTransactionType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");

  // Form states
  const [accountName, setAccountName] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<"EXPENSE" | "INCOME">("EXPENSE");

  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txFromAccount, setTxFromAccount] = useState("");
  const [txToAccount, setTxToAccount] = useState("");
  const [txNote, setTxNote] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);

  // Report states
  const [reportRange, setReportRange] = useState<"week" | "month" | "year">("month");

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch all data
  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [accRes, catRes, goalRes, txRes] = await Promise.all([
        fetch("/api/budget/accounts"),
        fetch("/api/budget/categories"),
        fetch(`/api/budget/goals?year=${currentYear}&month=${currentMonth}`),
        fetch(`/api/budget/transactions?year=${currentYear}&month=${currentMonth}`),
      ]);

      if (accRes.ok && catRes.ok && goalRes.ok && txRes.ok) {
        const accData = await accRes.json();
        const catData = await catRes.json();
        const goalData = await goalRes.json();
        const txData = await txRes.json();

        setAccounts(accData);
        setCategories(catData);
        setGoals(goalData);
        setTransactions(txData);
      }
    } catch (e) {
      console.error(e);
      triggerToast("Lỗi khi tải dữ liệu tài chính.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, currentYear, currentMonth]);

  // Handle goals change
  const handleGoalBlur = async (categoryId: string, amountStr: string) => {
    const amount = amountStr === "" ? 0 : Number(amountStr);
    if (isNaN(amount) || amount < 0) return;

    try {
      const res = await fetch("/api/budget/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          amount,
          year: currentYear,
          month: currentMonth,
        }),
      });

      if (res.ok) {
        const updatedGoal = await res.json();
        setGoals((prev) => {
          const index = prev.findIndex((g) => g.categoryId === categoryId);
          if (index > -1) {
            const next = [...prev];
            next[index] = updatedGoal;
            return next;
          }
          return [...prev, updatedGoal];
        });
        triggerToast("Đã lưu dự tính ngân sách!");
      }
    } catch (e) {
      console.error(e);
      triggerToast("Lỗi khi lưu dự tính.");
    }
  };

  // Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return;

    try {
      const res = await fetch("/api/budget/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountName.trim(),
          balance: accountBalance ? Number(accountBalance) : 0,
        }),
      });

      if (res.ok) {
        setAccountName("");
        setAccountBalance("");
        setShowAddAccount(false);
        triggerToast("Đã thêm tài khoản mới!");
        fetchData();
      } else {
        const body = await res.json();
        triggerToast(body.error || "Không thể tạo tài khoản.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      const res = await fetch("/api/budget/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName.trim(),
          type: categoryType,
        }),
      });

      if (res.ok) {
        setCategoryName("");
        setShowAddCategory(false);
        triggerToast("Đã tạo danh mục phân loại mới!");
        fetchData();
      } else {
        const body = await res.json();
        triggerToast(body.error || "Không thể tạo danh mục.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Log Transaction
  const handleLogTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || isNaN(Number(txAmount))) {
      triggerToast("Số tiền không hợp lệ.");
      return;
    }

    if (transactionType === "EXPENSE" && !txFromAccount) {
      triggerToast("Vui lòng chọn tài khoản nguồn chi.");
      return;
    }
    if (transactionType === "INCOME" && !txToAccount) {
      triggerToast("Vui lòng chọn tài khoản nhận tiền.");
      return;
    }
    if (transactionType === "TRANSFER" && (!txFromAccount || !txToAccount)) {
      triggerToast("Vui lòng chọn tài khoản chuyển và nhận.");
      return;
    }

    try {
      const res = await fetch("/api/budget/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(txAmount),
          type: transactionType,
          categoryId: transactionType !== "TRANSFER" ? txCategory : null,
          fromAccountId: transactionType !== "INCOME" ? txFromAccount : null,
          toAccountId: transactionType !== "EXPENSE" ? txToAccount : null,
          note: txNote.trim(),
          occurredAt: new Date(txDate).toISOString(),
        }),
      });

      if (res.ok) {
        setTxAmount("");
        setTxCategory("");
        setTxFromAccount("");
        setTxToAccount("");
        setTxNote("");
        setShowLogTransaction(false);
        triggerToast("Đã ghi nhận giao dịch mới!");
        fetchData();
      } else {
        const body = await res.json();
        triggerToast(body.error || "Lỗi khi ghi giao dịch.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Transaction
  const handleDeleteTx = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa giao dịch này không? Số dư tài khoản liên quan sẽ được khôi phục.")) return;

    try {
      const res = await fetch(`/api/budget/transactions?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        triggerToast("Đã xóa giao dịch.");
        fetchData();
      } else {
        const body = await res.json();
        triggerToast(body.error || "Không thể xóa giao dịch.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Financial Calculations
  const formatVND = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val).replace("₫", "đ");
  };

  // Process Accounts data for monthly overview
  // Account Gốc (Starting Balance) = currentBalance - totalInThisMonth + totalOutThisMonth
  const processedAccounts = accounts.map((acc) => {
    const inThisMonth = transactions
      .filter((t) => t.toAccountId === acc.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const outThisMonth = transactions
      .filter((t) => t.fromAccountId === acc.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const starting = acc.balance - inThisMonth + outThisMonth;

    return {
      ...acc,
      starting,
      incoming: inThisMonth,
      outgoing: outThisMonth,
    };
  });

  const totalStarting = processedAccounts.reduce((sum, a) => sum + a.starting, 0);
  const totalCurrent = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Income categories actual
  const incomeCategoriesData = categories
    .filter((c) => c.type === "INCOME")
    .map((cat) => {
      const actual = transactions
        .filter((t) => t.categoryId === cat.id && t.type === "INCOME")
        .reduce((sum, t) => sum + t.amount, 0);

      const planned = goals.find((g) => g.categoryId === cat.id)?.amount || 0;
      const diff = actual - planned;

      return { ...cat, planned, actual, diff };
    });

  // Expense categories actual
  const expenseCategoriesData = categories
    .filter((c) => c.type === "EXPENSE")
    .map((cat) => {
      const actual = transactions
        .filter((t) => t.categoryId === cat.id && t.type === "EXPENSE")
        .reduce((sum, t) => sum + t.amount, 0);

      const planned = goals.find((g) => g.categoryId === cat.id)?.amount || 0;
      const diff = actual - planned;

      return { ...cat, planned, actual, diff };
    });

  // Dòng tiền (Money flow card values)
  const totalIncomePlanned = incomeCategoriesData.reduce((sum, c) => sum + c.planned, 0);
  const totalIncomeActual = incomeCategoriesData.reduce((sum, c) => sum + c.actual, 0);

  const totalExpensePlanned = expenseCategoriesData.reduce((sum, c) => sum + c.planned, 0);
  const totalExpenseActual = expenseCategoriesData.reduce((sum, c) => sum + c.actual, 0);

  const totalSavingsPlanned = 0; // Simple placeholder or calculated if marked
  const totalSavingsActual = 0;

  const remainingPlanned = totalStarting + totalIncomePlanned - totalExpensePlanned;
  const remainingActual = totalIncomeActual - totalExpenseActual; // Net cash flow of the month

  // Chart data formatting
  // Group transactions for Bar Chart (Income vs Expense)
  const getChartData = () => {
    if (reportRange === "month" || reportRange === "week") {
      // Group by day of the month/week
      const days: Record<string, { name: string; income: number; expense: number }> = {};
      
      transactions.forEach((t) => {
        const dateObj = new Date(t.occurredAt);
        const label = dateObj.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        if (!days[label]) {
          days[label] = { name: label, income: 0, expense: 0 };
        }
        if (t.type === "INCOME") days[label].income += t.amount;
        if (t.type === "EXPENSE") days[label].expense += t.amount;
      });

      return Object.values(days).sort((a, b) => {
        const [da, ma] = a.name.split("/");
        const [db, mb] = b.name.split("/");
        return new Date(2026, Number(ma) - 1, Number(da)).getTime() - new Date(2026, Number(mb) - 1, Number(db)).getTime();
      });
    } else {
      // Group by month of the year
      const months = Array.from({ length: 12 }, (_, i) => ({
        name: `Tháng ${i + 1}`,
        income: 0,
        expense: 0,
      }));

      // Since the transactions state is month-filtered, we would normally fetch a full year.
      // But for simplicity of this client view, we'll map current month transactions.
      transactions.forEach((t) => {
        const dateObj = new Date(t.occurredAt);
        const mIdx = dateObj.getMonth();
        if (t.type === "INCOME") months[mIdx].income += t.amount;
        if (t.type === "EXPENSE") months[mIdx].expense += t.amount;
      });

      return months;
    }
  };

  // Get Pie Chart data
  const getPieData = () => {
    const data = expenseCategoriesData
      .filter((c) => c.actual > 0)
      .map((c) => ({
        name: c.name,
        value: c.actual,
      }));
    return data.length > 0 ? data : [{ name: "Chưa chi tiêu", value: 1 }];
  };

  const PIE_COLORS = ["#A172FD", "#38BDF8", "#F472B6", "#FB923C", "#A7F3D0", "#F87171", "#C084FC", "#93C5FD"];

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex rounded-full bg-white/60 p-1.5 shadow-sm border border-purple-100/50 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("monthly")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-black transition-all ${
              activeTab === "monthly" ? "bg-[#A172FD] text-white shadow-md" : "text-[#6B7280] hover:text-[#A172FD]"
            }`}
          >
            <Wallet className="h-4 w-4" />
            Quản lý tháng
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-black transition-all ${
              activeTab === "reports" ? "bg-[#A172FD] text-white shadow-md" : "text-[#6B7280] hover:text-[#A172FD]"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Báo cáo & Phân tích
          </button>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full border border-purple-100 shadow-sm">
          <button
            onClick={() => {
              if (currentMonth === 1) {
                setCurrentMonth(12);
                setCurrentYear((y) => y - 1);
              } else {
                setCurrentMonth((m) => m - 1);
              }
            }}
            className="p-1 rounded-full hover:bg-purple-50 text-purple-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-black text-purple-950 uppercase">
            Tháng {currentMonth} / {currentYear}
          </span>
          <button
            onClick={() => {
              if (currentMonth === 12) {
                setCurrentMonth(1);
                setCurrentYear((y) => y + 1);
              } else {
                setCurrentMonth((m) => m + 1);
              }
            }}
            className="p-1 rounded-full hover:bg-purple-50 text-purple-600 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#A172FD] border-t-transparent"></div>
          <p className="mt-4 text-[#A172FD] font-black animate-pulse">Đang tải dữ liệu ví xèng...</p>
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
                <button
                  onClick={() => { setTransactionType("EXPENSE"); setShowLogTransaction(true); }}
                  className="group flex items-center justify-between p-5 rounded-[24px] bg-gradient-to-r from-red-50 to-red-100/50 border border-red-100 hover:shadow-md transition-all active:scale-[0.98] text-left"
                >
                  <div>
                    <h3 className="text-xs font-black text-red-600 uppercase tracking-wider">Tác vụ chi phí</h3>
                    <p className="text-lg font-black text-red-950 mt-0.5">Ghi chi tiêu 💸</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white text-red-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                </button>

                <button
                  onClick={() => { setTransactionType("INCOME"); setShowLogTransaction(true); }}
                  className="group flex items-center justify-between p-5 rounded-[24px] bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-100 hover:shadow-md transition-all active:scale-[0.98] text-left"
                >
                  <div>
                    <h3 className="text-xs font-black text-emerald-600 uppercase tracking-wider">Tác vụ dòng tiền vào</h3>
                    <p className="text-lg font-black text-emerald-950 mt-0.5">Ghi thu nhập 💰</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white text-emerald-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </button>

                <button
                  onClick={() => { setTransactionType("TRANSFER"); setShowLogTransaction(true); }}
                  className="group flex items-center justify-between p-5 rounded-[24px] bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-100 hover:shadow-md transition-all active:scale-[0.98] text-left"
                >
                  <div>
                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Tác vụ chuyển khoản</h3>
                    <p className="text-lg font-black text-indigo-950 mt-0.5">Chuyển tài khoản 🔄</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white text-indigo-500 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <ArrowRightLeft className="h-5 w-5" />
                  </div>
                </button>
              </div>

              {/* Dòng Tiền & Nguồn Tiền Card Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Dòng tiền Overview */}
                <div className="lg:col-span-5 bg-white rounded-[32px] p-6 shadow-sm border border-purple-50 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-black text-purple-950 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[#A172FD]" />
                      Dòng tiền tháng này
                    </h3>
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-500">Xèng ban đầu</span>
                        <span className="font-bold text-gray-400">Dự tính: {formatVND(totalStarting)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-emerald-600">Tiền vào (+)</span>
                        <div className="flex gap-4">
                          <span className="font-semibold text-gray-400">Dự tính: {formatVND(totalIncomePlanned)}</span>
                          <span className="font-black text-emerald-600">Thực tế: {formatVND(totalIncomeActual)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-red-600">Tiền ra (-)</span>
                        <div className="flex gap-4">
                          <span className="font-semibold text-gray-400">Dự tính: {formatVND(totalExpensePlanned)}</span>
                          <span className="font-black text-red-600">Thực tế: {formatVND(totalExpenseActual)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-purple-600">Tiết kiệm</span>
                        <div className="flex gap-4">
                          <span className="font-semibold text-gray-400">Dự tính: {formatVND(totalSavingsPlanned)}</span>
                          <span className="font-black text-purple-600">Thực tế: {formatVND(totalSavingsActual)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-purple-50 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Còn lại (Dự tính)</p>
                      <p className="text-lg font-black text-purple-950">{formatVND(remainingPlanned)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase">Thực tế thặng dư</p>
                      <p className={`text-lg font-black ${remainingActual >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {remainingActual >= 0 ? "+" : ""}{formatVND(remainingActual)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Nguồn tiền (Accounts Table) */}
                <div className="lg:col-span-7 bg-white rounded-[32px] p-6 shadow-sm border border-purple-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-purple-950 flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-[#A172FD]" />
                      Nguồn tiền tài khoản
                    </h3>
                    <button
                      onClick={() => setShowAddAccount(true)}
                      className="flex items-center gap-1 text-[11px] font-black text-[#A172FD] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full transition-all"
                    >
                      <Plus className="h-3 w-3" /> Thêm nguồn tiền
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-purple-50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                          <th className="py-2.5">Tài khoản</th>
                          <th className="py-2.5 text-right">Gốc</th>
                          <th className="py-2.5 text-right text-emerald-600">Vào</th>
                          <th className="py-2.5 text-right text-red-600">Ra</th>
                          <th className="py-2.5 text-right text-purple-950">Số dư</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-50/50 text-xs font-semibold text-gray-700">
                        {processedAccounts.map((acc) => (
                          <tr key={acc.id} className="hover:bg-purple-50/20 transition-colors">
                            <td className="py-2.5 font-bold text-gray-900">{acc.name}</td>
                            <td className="py-2.5 text-right text-gray-500">{formatVND(acc.starting)}</td>
                            <td className="py-2.5 text-right text-emerald-600">+{formatVND(acc.incoming)}</td>
                            <td className="py-2.5 text-right text-red-500">-{formatVND(acc.outgoing)}</td>
                            <td className="py-2.5 text-right font-black text-purple-950">{formatVND(acc.balance)}</td>
                          </tr>
                        ))}
                        {processedAccounts.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                              Chưa có tài khoản nào. Hãy nhấp "Thêm nguồn tiền" ở trên!
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {processedAccounts.length > 0 && (
                        <tfoot>
                          <tr className="border-t border-purple-100 font-black text-xs text-purple-950">
                            <td className="py-3">Tổng</td>
                            <td className="py-3 text-right">{formatVND(totalStarting)}</td>
                            <td className="py-3 text-right text-emerald-600">+{formatVND(transactions.filter(t => t.type === "INCOME").reduce((s,t) => s+t.amount, 0))}</td>
                            <td className="py-3 text-right text-red-500">-{formatVND(transactions.filter(t => t.type === "EXPENSE").reduce((s,t) => s+t.amount, 0))}</td>
                            <td className="py-3 text-right text-purple-950">{formatVND(totalCurrent)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>

              {/* Bảng chi tiết Thu Nhập & Chi Phí (Dự tính vs Thực tế) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Bảng Thu Nhập */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-purple-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-emerald-900 flex items-center gap-2">
                      <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
                      Thu nhập của tháng
                    </h3>
                    <button
                      onClick={() => { setCategoryType("INCOME"); setShowAddCategory(true); }}
                      className="flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-all"
                    >
                      <Plus className="h-3 w-3" /> Danh mục mới
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-purple-50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                          <th className="py-2.5">Khoản thu</th>
                          <th className="py-2.5 text-right w-32">Dự tính</th>
                          <th className="py-2.5 text-right">Thực tế</th>
                          <th className="py-2.5 text-right">Chênh lệch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-50/50 text-xs font-semibold text-gray-700">
                        {incomeCategoriesData.map((cat) => (
                          <tr key={cat.id} className="hover:bg-purple-50/20 transition-colors">
                            <td className="py-2.5 font-bold text-gray-900">{cat.name}</td>
                            <td className="py-2.5 text-right">
                              <input
                                type="number"
                                defaultValue={cat.planned || ""}
                                placeholder="0đ"
                                onBlur={(e) => handleGoalBlur(cat.id, e.target.value)}
                                className="w-full rounded-lg bg-gray-50 border border-transparent px-2.5 py-1 text-right font-bold text-purple-950 focus:border-[#A172FD] focus:bg-white outline-none"
                              />
                            </td>
                            <td className="py-2.5 text-right text-emerald-600 font-bold">{formatVND(cat.actual)}</td>
                            <td className={`py-2.5 text-right font-black ${cat.diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {cat.diff >= 0 ? "+" : ""}{formatVND(cat.diff)}
                            </td>
                          </tr>
                        ))}
                        {incomeCategoriesData.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">
                              Chưa có danh mục thu nhập. Tạo một danh mục ở trên!
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {incomeCategoriesData.length > 0 && (
                        <tfoot>
                          <tr className="border-t border-purple-100 font-black text-xs text-purple-950">
                            <td className="py-3">Tổng thu nhập</td>
                            <td className="py-3 text-right pr-2">{formatVND(totalIncomePlanned)}</td>
                            <td className="py-3 text-right text-emerald-600">{formatVND(totalIncomeActual)}</td>
                            <td className={`py-3 text-right ${totalIncomeActual - totalIncomePlanned >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {totalIncomeActual - totalIncomePlanned >= 0 ? "+" : ""}{formatVND(totalIncomeActual - totalIncomePlanned)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* 2. Bảng Chi Phí */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-purple-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-red-900 flex items-center gap-2">
                      <TrendingDown className="h-4.5 w-4.5 text-red-500" />
                      Chi phí của tháng
                    </h3>
                    <button
                      onClick={() => { setCategoryType("EXPENSE"); setShowAddCategory(true); }}
                      className="flex items-center gap-1 text-[11px] font-black text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-all"
                    >
                      <Plus className="h-3 w-3" /> Danh mục mới
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-purple-50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                          <th className="py-2.5">Khoản chi</th>
                          <th className="py-2.5 text-right w-32">Dự tính</th>
                          <th className="py-2.5 text-right">Thực tế</th>
                          <th className="py-2.5 text-right">Chênh lệch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-50/50 text-xs font-semibold text-gray-700">
                        {expenseCategoriesData.map((cat) => (
                          <tr key={cat.id} className="hover:bg-purple-50/20 transition-colors">
                            <td className="py-2.5 font-bold text-gray-900">{cat.name}</td>
                            <td className="py-2.5 text-right">
                              <input
                                type="number"
                                defaultValue={cat.planned || ""}
                                placeholder="0đ"
                                onBlur={(e) => handleGoalBlur(cat.id, e.target.value)}
                                className="w-full rounded-lg bg-gray-50 border border-transparent px-2.5 py-1 text-right font-bold text-purple-950 focus:border-[#A172FD] focus:bg-white outline-none"
                              />
                            </td>
                            <td className="py-2.5 text-right text-red-500 font-bold">{formatVND(cat.actual)}</td>
                            <td className={`py-2.5 text-right font-black ${cat.diff <= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {cat.diff > 0 ? "+" : ""}{formatVND(cat.diff)}
                            </td>
                          </tr>
                        ))}
                        {expenseCategoriesData.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">
                              Chưa có danh mục chi phí. Tạo một danh mục ở trên!
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {expenseCategoriesData.length > 0 && (
                        <tfoot>
                          <tr className="border-t border-purple-100 font-black text-xs text-purple-950">
                            <td className="py-3">Tổng chi phí</td>
                            <td className="py-3 text-right pr-2">{formatVND(totalExpensePlanned)}</td>
                            <td className="py-3 text-right text-red-500">{formatVND(totalExpenseActual)}</td>
                            <td className={`py-3 text-right ${totalExpenseActual - totalExpensePlanned <= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {totalExpenseActual - totalExpensePlanned > 0 ? "+" : ""}{formatVND(totalExpenseActual - totalExpensePlanned)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>

              {/* Bảng Logs Giao dịch chi tiết */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Chi tiết Thu Nhập */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-purple-50">
                  <h3 className="text-sm font-black text-purple-950 mb-4">Chi tiết các khoản thu</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-purple-50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                          <th className="py-2">Danh mục</th>
                          <th className="py-2">Ngày</th>
                          <th className="py-2 text-right">Xèng</th>
                          <th className="py-2">TK nhận</th>
                          <th className="py-2">Chi tiết</th>
                          <th className="py-2 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-50/50 font-semibold text-gray-600">
                        {transactions.filter(t => t.type === "INCOME").map((t) => (
                          <tr key={t.id} className="hover:bg-purple-50/10">
                            <td className="py-2.5 font-bold text-gray-900">{t.category?.name || "Khác"}</td>
                            <td className="py-2.5">{new Date(t.occurredAt).toLocaleDateString("vi-VN")}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-600">+{formatVND(t.amount)}</td>
                            <td className="py-2.5">{t.toAccount?.name || "Ví"}</td>
                            <td className="py-2.5 truncate max-w-[80px]" title={t.note || ""}>{t.note || "-"}</td>
                            <td className="py-2.5 text-center">
                              <button onClick={() => handleDeleteTx(t.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {transactions.filter(t => t.type === "INCOME").length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-gray-400">Không có bản ghi thu nhập nào.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Chi tiết Chi Tiêu & Chuyển khoản */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-purple-50">
                  <h3 className="text-sm font-black text-purple-950 mb-4">Chi tiết các khoản chi & chuyển khoản</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-purple-50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                          <th className="py-2">Danh mục/Loại</th>
                          <th className="py-2">Ngày</th>
                          <th className="py-2 text-right">Xèng</th>
                          <th className="py-2">TK Nguồn</th>
                          <th className="py-2">Đến/Note</th>
                          <th className="py-2 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-50/50 font-semibold text-gray-600">
                        {transactions.filter(t => t.type === "EXPENSE" || t.type === "TRANSFER").map((t) => (
                          <tr key={t.id} className="hover:bg-purple-50/10">
                            <td className="py-2.5 font-bold text-gray-900">
                              {t.type === "TRANSFER" ? (
                                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">Chuyển khoản</span>
                              ) : (
                                t.category?.name || "Khác"
                              )}
                            </td>
                            <td className="py-2.5">{new Date(t.occurredAt).toLocaleDateString("vi-VN")}</td>
                            <td className={`py-2.5 text-right font-bold ${t.type === "TRANSFER" ? "text-indigo-500" : "text-red-500"}`}>
                              {t.type === "TRANSFER" ? "" : "-"}{formatVND(t.amount)}
                            </td>
                            <td className="py-2.5">{t.fromAccount?.name || "Ví"}</td>
                            <td className="py-2.5 truncate max-w-[80px]" title={t.type === "TRANSFER" ? `Đến: ${t.toAccount?.name}` : t.note || ""}>
                              {t.type === "TRANSFER" ? `➔ ${t.toAccount?.name}` : t.note || "-"}
                            </td>
                            <td className="py-2.5 text-center">
                              <button onClick={() => handleDeleteTx(t.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {transactions.filter(t => t.type === "EXPENSE" || t.type === "TRANSFER").length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-gray-400">Không có bản ghi chi tiêu/chuyển khoản nào.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
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
                  <BarChart3 className="h-5 w-5 text-[#A172FD]" />
                  Báo cáo trực quan
                </h3>
                <div className="flex rounded-full bg-white p-1 shadow-sm border border-purple-100">
                  <button
                    onClick={() => setReportRange("week")}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                      reportRange === "week" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280] hover:text-[#A172FD]"
                    }`}
                  >
                    Tuần
                  </button>
                  <button
                    onClick={() => setReportRange("month")}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                      reportRange === "month" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280] hover:text-[#A172FD]"
                    }`}
                  >
                    Tháng
                  </button>
                  <button
                    onClick={() => setReportRange("year")}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                      reportRange === "year" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280] hover:text-[#A172FD]"
                    }`}
                  >
                    Năm
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-[24px] border border-purple-50 shadow-sm flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Tổng thu nhập thực tế</p>
                    <p className="text-xl font-black text-emerald-600">{formatVND(totalIncomeActual)}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-[24px] border border-purple-50 shadow-sm flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Tổng chi phí thực tế</p>
                    <p className="text-xl font-black text-red-500">{formatVND(totalExpenseActual)}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-[24px] border border-purple-50 shadow-sm flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-purple-50 text-[#A172FD] flex items-center justify-center">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Tỷ lệ thặng dư khả dụng</p>
                    <p className="text-xl font-black text-[#581C87]">
                      {totalIncomeActual > 0
                        ? `${Math.round(((totalIncomeActual - totalExpenseActual) / totalIncomeActual) * 100)}%`
                        : "0%"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Bar Chart (Comparison) */}
                <div className="lg:col-span-8 bg-white rounded-[32px] p-6 shadow-sm border border-purple-50">
                  <h4 className="text-sm font-black text-purple-950 mb-6">Biến động Thu nhập vs Chi tiêu</h4>
                  <div className="h-80 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getChartData()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#6B7280" }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B7280" }} />
                        <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                        <Legend iconType="circle" />
                        <Bar name="Thu nhập" dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar name="Chi phí" dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Pie Chart (Breakdown) */}
                <div className="lg:col-span-4 bg-white rounded-[32px] p-6 shadow-sm border border-purple-50 flex flex-col justify-between">
                  <h4 className="text-sm font-black text-purple-950 mb-2">Cơ cấu chi tiêu thực tế</h4>
                  <div className="h-60 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getPieData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {getPieData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatVND(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie Chart Legend */}
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {expenseCategoriesData.filter(c => c.actual > 0).map((cat, i) => (
                      <div key={cat.id} className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2 text-gray-500">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span>{cat.name}</span>
                        </div>
                        <span className="text-purple-950">{formatVND(cat.actual)}</span>
                      </div>
                    ))}
                    {expenseCategoriesData.filter(c => c.actual > 0).length === 0 && (
                      <p className="text-center text-xs text-gray-400 py-4 font-semibold">Chưa phát sinh chi phí nào trong tháng.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Modals and Forms */}
      <AnimatePresence>
        {/* Toast Toast notification */}
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[280] flex items-center gap-3 rounded-2xl bg-white border border-purple-100 p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-[#A172FD]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-gray-800">{toastMessage}</p>
          </motion.div>
        )}

        {/* 1. Modal Add Account */}
        {showAddAccount && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/40 backdrop-blur-md p-4" onClick={() => setShowAddAccount(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-[400px] rounded-[32px] p-8 shadow-2xl border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-purple-950">Thêm nguồn tiền mới</h3>
                <button onClick={() => setShowAddAccount(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleAddAccount} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Tên tài khoản</label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Ví dụ: Ví điện tử Momo, Tiền mặt..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Số dư hiện tại (đ)</label>
                  <input
                    type="number"
                    value={accountBalance}
                    onChange={(e) => setAccountBalance(e.target.value)}
                    placeholder="0đ"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
                  />
                </div>
                <button type="submit" className="w-full mt-2 rounded-xl bg-[#A172FD] py-3.5 font-bold text-white hover:bg-[#8b5cf6] transition-colors shadow-md text-sm">
                  Lưu tài khoản
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. Modal Add Category */}
        {showAddCategory && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/40 backdrop-blur-md p-4" onClick={() => setShowAddCategory(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-[400px] rounded-[32px] p-8 shadow-2xl border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-purple-950">
                  Thêm danh mục {categoryType === "INCOME" ? "Thu nhập" : "Chi tiêu"}
                </h3>
                <button onClick={() => setShowAddCategory(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Tên danh mục mới</label>
                  <input
                    type="text"
                    required
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Ví dụ: Ăn uống, Lương cứng, Đi chơi..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
                  />
                </div>
                <button type="submit" className="w-full mt-2 rounded-xl bg-[#A172FD] py-3.5 font-bold text-white hover:bg-[#8b5cf6] transition-colors shadow-md text-sm">
                  Lưu danh mục
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* 3. Modal Log Transaction (Add Expense / Income / Transfer) */}
        {showLogTransaction && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/40 backdrop-blur-md p-4" onClick={() => setShowLogTransaction(false)}>
            <motion.div
              initial={{ y: 150, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 150, opacity: 0 }}
              className="bg-white w-full max-w-[500px] rounded-[32px] p-8 shadow-2xl border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-purple-950">Ghi nhận giao dịch</h3>
                <button onClick={() => setShowLogTransaction(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
              </div>

              {/* Transaction Type tab buttons inside modal */}
              <div className="grid grid-cols-3 gap-1 bg-purple-50 p-1 rounded-xl text-xs font-black mb-6">
                <button
                  type="button"
                  onClick={() => setTransactionType("EXPENSE")}
                  className={`py-2 rounded-lg text-center transition-all ${transactionType === "EXPENSE" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280] hover:text-[#A172FD]"}`}
                >
                  Chi tiêu
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType("INCOME")}
                  className={`py-2 rounded-lg text-center transition-all ${transactionType === "INCOME" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280] hover:text-[#A172FD]"}`}
                >
                  Thu nhập
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType("TRANSFER")}
                  className={`py-2 rounded-lg text-center transition-all ${transactionType === "TRANSFER" ? "bg-[#A172FD] text-white shadow-sm" : "text-[#6B7280] hover:text-[#A172FD]"}`}
                >
                  Chuyển khoản
                </button>
              </div>

              <form onSubmit={handleLogTransaction} className="space-y-4">
                {/* 1. Amount */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Số tiền (đ)</label>
                  <input
                    type="number"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="Nhập số tiền..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-lg font-black text-purple-950 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
                  />
                </div>

                {/* 2. Selection fields depending on type */}
                {transactionType !== "TRANSFER" && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Danh mục phân loại</label>
                    <select
                      required
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
                    >
                      <option value="" disabled>-- Chọn phân loại --</option>
                      {categories
                        .filter((c) => c.type === transactionType)
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {transactionType !== "INCOME" && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                        {transactionType === "TRANSFER" ? "Từ tài khoản" : "Tài khoản nguồn chi"}
                      </label>
                      <select
                        required
                        value={txFromAccount}
                        onChange={(e) => setTxFromAccount(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
                      >
                        <option value="" disabled>-- Chọn tài khoản --</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} ({formatVND(a.balance)})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {transactionType !== "EXPENSE" && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                        {transactionType === "TRANSFER" ? "Đến tài khoản" : "Tài khoản nhận tiền"}
                      </label>
                      <select
                        required
                        value={txToAccount}
                        onChange={(e) => setTxToAccount(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
                      >
                        <option value="" disabled>-- Chọn tài khoản --</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} ({formatVND(a.balance)})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* 3. Date */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Thời gian</label>
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#A172FD]"
                    />
                  </div>

                  {/* 4. Note */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Ghi chú chi tiết</label>
                    <input
                      type="text"
                      value={txNote}
                      onChange={(e) => setTxNote(e.target.value)}
                      placeholder="Ăn tối, đi xem phim..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#A172FD] focus:ring-1 focus:ring-[#A172FD]"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full mt-4 rounded-xl bg-[#A172FD] py-4 font-bold text-white hover:bg-[#8b5cf6] transition-transform active:scale-[0.99] shadow-lg text-sm">
                  Ghi lại ngay ➔
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
