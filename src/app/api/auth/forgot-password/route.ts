import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";
import { applyRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export async function POST(req: Request) {
  try {
    // 1. Rate Limit: Giới hạn tối đa 3 lần yêu cầu / 5 phút (300,000ms) trên 1 IP
    const rateLimit = applyRateLimit(req, {
      keyPrefix: "forgot-pw",
      limit: 3,
      windowMs: 5 * 60 * 1000,
    });
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.reset);
    }

    const json = await req.json().catch(() => null);
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Email không hợp lệ" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    // 2. Chống Spam cho cùng 1 email (tối đa 1 mã / 60 giây)
    const existingToken = await db.verificationToken.findFirst({
      where: { identifier: email },
      orderBy: { expires: "desc" },
    });
    if (existingToken) {
      const msSinceCreation = 15 * 60 * 1000 - (existingToken.expires.getTime() - Date.now());
      if (msSinceCreation < 60 * 1000) {
        return NextResponse.json(
          { error: "Vui lòng đợi 1 phút trước khi yêu cầu gửi lại mã xác thực mới." },
          { status: 429 }
        );
      }
    }

    // 3. Check if user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    // Chống User Enumeration: Nếu email không tồn tại trong hệ thống,
    // vẫn trả về thông báo thành công chung để hacker không thể dò quét danh sách email
    if (!user) {
      return NextResponse.json({
        ok: true,
        message: "Nếu email tồn tại trong hệ thống, mã xác thực đã được gửi. Vui lòng kiểm tra hộp thư (kể cả mục Spam).",
      });
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Remove any previous OTPs for this email
    await db.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Save new OTP to VerificationToken with 0 attempts
    await db.verificationToken.create({
      data: {
        identifier: email,
        token: otp,
        attempts: 0,
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
      // Only expose devOtp in non-production local development when SMTP is not configured
      devOtp: process.env.NODE_ENV !== "production" && emailRes.simulated ? otp : undefined,
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Không thể xử lý yêu cầu. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
