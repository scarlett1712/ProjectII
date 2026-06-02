import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";
import { TransactionType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month")); // 1-indexed (1 = January, 12 = December)

    if (isNaN(year) || isNaN(month)) {
      return NextResponse.json({ error: "Năm và tháng không hợp lệ" }, { status: 400 });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const transactions = await db.budgetTransaction.findMany({
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
    });

    return NextResponse.json(transactions);
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
    const { amount, type, categoryId, fromAccountId, toAccountId, note, occurredAt } = body;

    if (!amount || !type) {
      return NextResponse.json({ error: "Số tiền và phân loại là bắt buộc" }, { status: 400 });
    }

    const value = Number(amount);
    const occurredTime = occurredAt ? new Date(occurredAt) : new Date();

    // Perform operations in a database transaction to ensure consistency
    const result = await db.$transaction(async (tx) => {
      // 1. Create the transaction record
      const transaction = await tx.budgetTransaction.create({
        data: {
          userId: auth.userId!,
          amount: value,
          type: type as TransactionType,
          categoryId: categoryId || null,
          fromAccountId: fromAccountId || null,
          toAccountId: toAccountId || null,
          note: note || null,
          occurredAt: occurredTime,
        },
      });

      // 2. Adjust account balances
      if (type === "EXPENSE" && fromAccountId) {
        await tx.budgetAccount.update({
          where: { id: fromAccountId },
          data: { balance: { decrement: value } },
        });
      } else if (type === "INCOME" && toAccountId) {
        await tx.budgetAccount.update({
          where: { id: toAccountId },
          data: { balance: { increment: value } },
        });
      } else if (type === "TRANSFER" && fromAccountId && toAccountId) {
        // Deduct from sender
        await tx.budgetAccount.update({
          where: { id: fromAccountId },
          data: { balance: { decrement: value } },
        });
        // Add to receiver
        await tx.budgetAccount.update({
          where: { id: toAccountId },
          data: { balance: { increment: value } },
        });
      }

      return transaction;
    });

    return NextResponse.json(result);
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
    const { id, amount, type, categoryId, fromAccountId, toAccountId, note, occurredAt } = body;

    if (!id || !amount || !type) {
      return NextResponse.json({ error: "Thiếu thông tin cập nhật" }, { status: 400 });
    }

    const value = Number(amount);
    const occurredTime = occurredAt ? new Date(occurredAt) : new Date();

    const result = await db.$transaction(async (tx) => {
      // 1. Get the original transaction
      const oldTx = await tx.budgetTransaction.findUnique({
        where: { id },
      });

      if (!oldTx || oldTx.userId !== auth.userId) {
        throw new Error("Giao dịch không tồn tại hoặc không thuộc quyền sở hữu của bạn");
      }

      // 2. Reverse old balances
      const oldVal = oldTx.amount;
      if (oldTx.type === "EXPENSE" && oldTx.fromAccountId) {
        await tx.budgetAccount.update({
          where: { id: oldTx.fromAccountId },
          data: { balance: { increment: oldVal } },
        });
      } else if (oldTx.type === "INCOME" && oldTx.toAccountId) {
        await tx.budgetAccount.update({
          where: { id: oldTx.toAccountId },
          data: { balance: { decrement: oldVal } },
        });
      } else if (oldTx.type === "TRANSFER" && oldTx.fromAccountId && oldTx.toAccountId) {
        await tx.budgetAccount.update({
          where: { id: oldTx.fromAccountId },
          data: { balance: { increment: oldVal } },
        });
        await tx.budgetAccount.update({
          where: { id: oldTx.toAccountId },
          data: { balance: { decrement: oldVal } },
        });
      }

      // 3. Apply new balances
      if (type === "EXPENSE" && fromAccountId) {
        await tx.budgetAccount.update({
          where: { id: fromAccountId },
          data: { balance: { decrement: value } },
        });
      } else if (type === "INCOME" && toAccountId) {
        await tx.budgetAccount.update({
          where: { id: toAccountId },
          data: { balance: { increment: value } },
        });
      } else if (type === "TRANSFER" && fromAccountId && toAccountId) {
        await tx.budgetAccount.update({
          where: { id: fromAccountId },
          data: { balance: { decrement: value } },
        });
        await tx.budgetAccount.update({
          where: { id: toAccountId },
          data: { balance: { increment: value } },
        });
      }

      // 4. Update the transaction record itself
      const updatedTx = await tx.budgetTransaction.update({
        where: { id },
        data: {
          amount: value,
          type: type as TransactionType,
          categoryId: type !== "TRANSFER" ? (categoryId || null) : null,
          fromAccountId: type !== "INCOME" ? (fromAccountId || null) : null,
          toAccountId: type !== "EXPENSE" ? (toAccountId || null) : null,
          note: note || null,
          occurredAt: occurredTime,
        },
      });

      return updatedTx;
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Server Error" }, { status: 500 });
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

    await db.$transaction(async (tx) => {
      // 1. Find transaction first to get account info and amount
      const txRecord = await tx.budgetTransaction.findUnique({
        where: { id },
      });

      if (!txRecord || txRecord.userId !== auth.userId) {
        throw new Error("Giao dịch không tồn tại hoặc không có quyền xóa");
      }

      // 2. Reverse balances
      const value = txRecord.amount;
      if (txRecord.type === "EXPENSE" && txRecord.fromAccountId) {
        await tx.budgetAccount.update({
          where: { id: txRecord.fromAccountId },
          data: { balance: { increment: value } },
        });
      } else if (txRecord.type === "INCOME" && txRecord.toAccountId) {
        await tx.budgetAccount.update({
          where: { id: txRecord.toAccountId },
          data: { balance: { decrement: value } },
        });
      } else if (txRecord.type === "TRANSFER" && txRecord.fromAccountId && txRecord.toAccountId) {
        await tx.budgetAccount.update({
          where: { id: txRecord.fromAccountId },
          data: { balance: { increment: value } },
        });
        await tx.budgetAccount.update({
          where: { id: txRecord.toAccountId },
          data: { balance: { decrement: value } },
        });
      }

      // 3. Delete the transaction record
      await tx.budgetTransaction.delete({
        where: { id },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Server Error" }, { status: 500 });
  }
}
