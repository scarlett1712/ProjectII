import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  otp: z.string().min(6, "Mã xác thực gồm 6 số").max(6, "Mã xác thực gồm 6 số"),
  newPassword: z.string().min(8, "Mật khẩu mới phải có tối thiểu 8 ký tự"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const otp = parsed.data.otp.trim();
    const { newPassword } = parsed.data;

    // Verify user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Tài khoản không tồn tại." },
        { status: 404 }
      );
    }

    // Verify OTP token in VerificationToken
    const tokenRecord = await db.verificationToken.findFirst({
      where: {
        identifier: email,
        token: otp,
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "Mã xác thực không chính xác. Vui lòng kiểm tra lại." },
        { status: 400 }
      );
    }

    if (new Date() > tokenRecord.expires) {
      // Remove expired token
      await db.verificationToken.deleteMany({
        where: { identifier: email },
      });
      return NextResponse.json(
        { error: "Mã xác thực đã hết hạn (chỉ có hiệu lực trong 15 phút). Vui lòng yêu cầu mã mới." },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hash(newPassword, 12);

    // Update password in DB
    await db.user.update({
      where: { email },
      data: { passwordHash },
    });

    // Delete used verification token
    await db.verificationToken.deleteMany({
      where: { identifier: email },
    });

    return NextResponse.json({
      ok: true,
      message: "Đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập với mật khẩu mới.",
    });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "Không thể đặt lại mật khẩu. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
