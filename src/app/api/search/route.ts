import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json([]);
  
  const query = q.trim();

  try {
    const [events, tasks, meals, transactions] = await Promise.all([
      db.calendarEvent.findMany({
        where: { userId: auth.userId!, title: { contains: query, mode: "insensitive" } },
        take: 5
      }),
      db.taskItem.findMany({
        where: { userId: auth.userId!, title: { contains: query, mode: "insensitive" } },
        take: 5
      }),
      db.mealEntry.findMany({
        where: { userId: auth.userId!, mealName: { contains: query, mode: "insensitive" } },
        take: 5
      }),
      db.budgetTransaction.findMany({
        where: { userId: auth.userId!, note: { contains: query, mode: "insensitive" } },
        take: 5
      })
    ]);

    const results = [
      ...events.map(e => ({ 
        id: e.id, 
        title: e.title, 
        type: "Lịch trình", 
        href: "/calendar", 
        desc: `Bắt đầu: ${new Date(e.startAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}` 
      })),
      ...tasks.map(t => ({ 
        id: t.id, 
        title: t.title, 
        type: "Nhiệm vụ", 
        href: "/calendar", 
        desc: t.completed ? "Đã xong" : "Chưa xong" 
      })),
      ...meals.map(m => ({ 
        id: m.id, 
        title: m.mealName, 
        type: "Măm măm", 
        href: "/nutrition", 
        desc: `${m.grams}g - ${m.calories} kcal` 
      })),
      ...transactions.map(tr => ({ 
        id: tr.id, 
        title: tr.note || "Giao dịch", 
        type: "Xèng xèng", 
        href: "/budget", 
        desc: `${tr.type === 'EXPENSE' ? '-' : '+'}${tr.amount}đ` 
      }))
    ];

    return NextResponse.json(results);
  } catch (err) {
    console.error("Global search error:", err);
    return NextResponse.json({ error: "Lỗi tìm kiếm" }, { status: 500 });
  }
}
