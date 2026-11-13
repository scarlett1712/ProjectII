import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Email không hợp lệ" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Email này chưa được đăng ký trong hệ thống." },
        { status: 404 }
      );
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Remove any previous OTPs for this email
    await db.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Save new OTP to VerificationToken
    await db.verificationToken.create({
      data: {
        identifier: email,
        token: otp,
        expires,
      },
    });

    // Send email
    const emailRes = await sendOtpEmail({
      to: email,
      otp,
      name: user.name,
    });

    return NextResponse.json({
      ok: true,
      message: "Mã xác thực đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư (hoặc mục Spam).",
      // If running in development without SMTP, expose devOtp for convenience
      devOtp: emailRes.simulated ? otp : undefined,
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Không thể xử lý yêu cầu. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
