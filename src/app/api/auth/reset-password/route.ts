import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { applyRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  otp: z.string().min(6, "Mã xác thực gồm 6 số").max(6, "Mã xác thực gồm 6 số"),
  newPassword: z.string().min(8, "Mật khẩu mới phải có tối thiểu 8 ký tự"),
});

const MAX_OTP_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    // 1. Rate Limit IP: Tối đa 5 lần thử / phút trên cùng 1 IP
    const rateLimit = applyRateLimit(req, {
      keyPrefix: "reset-pw",
      limit: 5,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.reset);
    }

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

    // 2. Kiểm tra xem email này có token nào đang kích hoạt không
    const activeToken = await db.verificationToken.findFirst({
      where: { identifier: email },
      orderBy: { expires: "desc" },
    });

    if (!activeToken) {
      return NextResponse.json(
        { error: "Không tìm thấy yêu cầu đặt lại mật khẩu hoặc mã đã bị hủy. Vui lòng gửi lại yêu cầu." },
        { status: 400 }
      );
    }

    // 3. Kiểm tra token đã hết hạn chưa
    if (new Date() > activeToken.expires) {
      await db.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.json(
        { error: "Mã xác thực đã hết hạn (chỉ có hiệu lực trong 15 phút). Vui lòng yêu cầu mã mới." },
        { status: 400 }
      );
    }

    // 4. Kiểm tra số lần nhập sai (Anti Brute-Force Protection)
    if (activeToken.attempts >= MAX_OTP_ATTEMPTS) {
      // Hủy token ngay lập tức để chặn vét cạn
      await db.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.json(
        { error: "Bạn đã nhập sai mã xác thực quá 5 lần. Mã này đã bị vô hiệu hóa vì lý do bảo mật. Vui lòng yêu cầu mã mới." },
        { status: 429 }
      );
    }

    // 5. So khớp mã OTP
    if (activeToken.token !== otp) {
      // Tăng số lần thử sai lên 1
      const updated = await db.verificationToken.update({
        where: { token: activeToken.token },
        data: { attempts: { increment: 1 } },
      });
      const remaining = MAX_OTP_ATTEMPTS - updated.attempts;
      if (remaining <= 0) {
        await db.verificationToken.deleteMany({ where: { identifier: email } });
        return NextResponse.json(
          { error: "Mã xác thực không đúng. Bạn đã vượt quá 5 lần thử. Mã đã bị hủy để bảo vệ tài khoản!" },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `Mã xác thực không chính xác. Bạn còn ${remaining} lần thử.` },
        { status: 400 }
      );
    }

    // 6. OTP chính xác -> Verify user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Tài khoản không tồn tại." },
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await hash(newPassword, 12);

    // Update password in DB and increment tokenVersion to revoke old sessions
    await db.user.update({
      where: { email },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
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
