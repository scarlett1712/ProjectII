import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { signMobileToken } from "@/lib/token";
import { applyRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    // Rate limit: 10 requests per minute per IP
    const rateLimit = applyRateLimit(req, {
      keyPrefix: "mobile-login",
      limit: 10,
      windowMs: 60 * 1000,
    });
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.reset);
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Vui lòng nhập email và mật khẩu" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không chính xác" }, { status: 401 });
    }

    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không chính xác" }, { status: 401 });
    }

    // Generate cryptographically signed JWT token
    const token = signMobileToken(user.id);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profile: user.profile,
      },
    });
  } catch (err: any) {
    console.error("Mobile login error:", err);
    return NextResponse.json({ error: "Lỗi máy chủ khi đăng nhập" }, { status: 500 });
  }
}
