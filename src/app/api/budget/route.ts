import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await requireUserId(req);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year")) || now.getFullYear();
    const month = Number(searchParams.get("month")) || now.getMonth() + 1;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Parallel fetch all budget datasets in 1 single round-trip
    const [accounts, categories, goals, monthTransactions, sinceStartTransactions] = await Promise.all([
      db.budgetAccount.findMany({
        where: { userId: auth.userId! },
        orderBy: { name: "asc" },
      }),
      db.budgetCategory.findMany({
        where: { userId: auth.userId! },
        orderBy: { name: "asc" },
      }),
      db.budgetGoal.findMany({
        where: {
          userId: auth.userId!,
          year,
          month,
        },
      }),
      db.budgetTransaction.findMany({
        where: {
          userId: auth.userId!,
          occurredAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        include: {
          category: true,
          fromAccount: true,
          toAccount: true,
        },
        orderBy: { occurredAt: "desc" },
      }),
      // Transactions since startDate to calculate starting balance accurately
      db.budgetTransaction.findMany({
        where: {
          userId: auth.userId!,
          occurredAt: { gte: startDate },
        },
        select: {
          id: true,
          type: true,
          amount: true,
          fromAccountId: true,
          toAccountId: true,
        },
      }),
    ]);

    // Compute starting balance for each account
    const accountsWithStartingBalance = accounts.map((acc) => {
      let inflows = 0;
      let outflows = 0;

      sinceStartTransactions.forEach((tx) => {
        if (tx.type === "EXPENSE" && tx.fromAccountId === acc.id) {
          outflows += tx.amount;
        } else if (tx.type === "INCOME" && tx.toAccountId === acc.id) {
          inflows += tx.amount;
        } else if (tx.type === "TRANSFER") {
          if (tx.fromAccountId === acc.id) outflows += tx.amount;
          if (tx.toAccountId === acc.id) inflows += tx.amount;
        }
      });

      return {
        ...acc,
        startingBalance: acc.balance - inflows + outflows,
      };
    });

    return NextResponse.json({
      accounts: accountsWithStartingBalance,
      categories,
      goals,
      transactions: monthTransactions,
    });
  } catch (e: any) {
    console.error("Budget unified API error:", e);
    return NextResponse.json({ error: "Lỗi tải dữ liệu tài chính" }, { status: 500 });
  }
}
