import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";

const schema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: z.string().min(8, "Mật khẩu mới phải có tối thiểu 8 ký tự"),
});

export async function POST(req: Request) {
  try {
    const auth = await requireUserId(req);
    if (auth.response) return auth.response;

    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await db.user.findUnique({
      where: { id: auth.userId! },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Tài khoản không hợp lệ hoặc chưa thiết lập mật khẩu." },
        { status: 400 }
      );
    }

    // Verify current password
    const valid = await compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không chính xác." },
        { status: 400 }
      );
    }

    // Check if new password is the same as current password
    const same = await compare(newPassword, user.passwordHash);
    if (same) {
      return NextResponse.json(
        { error: "Mật khẩu mới không được trùng với mật khẩu hiện tại." },
        { status: 400 }
      );
    }

    // Hash new password and update
    const passwordHash = await hash(newPassword, 12);
    await db.user.update({
      where: { id: auth.userId! },
      data: { passwordHash },
    });

    return NextResponse.json({
      ok: true,
      message: "Đổi mật khẩu thành công!",
    });
  } catch (err: any) {
    console.error("Change password error:", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi đổi mật khẩu." },
      { status: 500 }
    );
  }
}
