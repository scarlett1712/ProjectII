import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  name: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const passwordHash = await hash(parsed.data.password, 12);

  try {
    await db.user.create({
      data: {
        email,
        passwordHash,
        name: parsed.data.name?.trim() || null,
      },
    });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "Email đã được đăng ký" }, { status: 409 });
    }
    if (code === "P1000" || code === "P1001") {
      return NextResponse.json(
        {
          error:
            "Không kết nối được database (sai mật khẩu hoặc user trong DATABASE_URL). Sửa file .env rồi chạy lại dev server.",
        },
        { status: 503 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Lỗi máy chủ khi tạo tài khoản." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
