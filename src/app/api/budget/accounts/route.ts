import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get("year");
    const monthStr = searchParams.get("month");

    const accounts = await db.budgetAccount.findMany({
      where: { userId: auth.userId! },
      orderBy: { name: "asc" },
    });

    if (yearStr && monthStr) {
      const year = Number(yearStr);
      const month = Number(monthStr);
      if (!isNaN(year) && !isNaN(month)) {
        const startDate = new Date(year, month - 1, 1);

        // Fetch all transactions since startDate
        const transactions = await db.budgetTransaction.findMany({
          where: {
            userId: auth.userId!,
            occurredAt: {
              gte: startDate,
            },
          },
        });

        // Compute starting balance for each account
        const accountStartingBalances = accounts.map((acc) => {
          let inflows = 0;
          let outflows = 0;

          transactions.forEach((tx) => {
            if (tx.type === "EXPENSE" && tx.fromAccountId === acc.id) {
              outflows += tx.amount;
            } else if (tx.type === "INCOME" && tx.toAccountId === acc.id) {
              inflows += tx.amount;
            } else if (tx.type === "TRANSFER") {
              if (tx.fromAccountId === acc.id) {
                outflows += tx.amount;
              }
              if (tx.toAccountId === acc.id) {
                inflows += tx.amount;
              }
            }
          });

          const startingBalance = acc.balance - inflows + outflows;
          return {
            ...acc,
            startingBalance,
          };
        });

        return NextResponse.json(accountStartingBalances);
      }
    }

    return NextResponse.json(accounts.map((acc) => ({ ...acc, startingBalance: acc.balance })));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { name, balance, color } = body;
    if (!name) {
      return NextResponse.json({ error: "Tên tài khoản không được để trống" }, { status: 400 });
    }

    const account = await db.budgetAccount.create({
      data: {
        userId: auth.userId!,
        name: String(name).trim(),
        balance: balance ? Number(balance) : 0,
        color: color ? String(color).trim() : "#A172FD",
      },
    });
    return NextResponse.json(account);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { id, name, balance, color } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (balance !== undefined) updateData.balance = Number(balance);
    if (color !== undefined) updateData.color = String(color).trim();

    const account = await db.budgetAccount.updateMany({
      where: { id, userId: auth.userId! },
      data: updateData,
    });
    return NextResponse.json(account);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    await db.budgetAccount.deleteMany({
      where: { id, userId: auth.userId! },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
