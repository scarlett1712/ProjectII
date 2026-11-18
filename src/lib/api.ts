import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyMobileToken } from "@/lib/token";

export type RequireUserIdResult =
  | { userId: string; response: null }
  | { userId: null; response: NextResponse };

export type RequireRoleResult =
  | { userId: string; role: string; response: null }
  | { userId: string | null; role: string | null; response: NextResponse };

export async function requireUserId(req?: Request): Promise<RequireUserIdResult> {
  // 1. Check for Mobile Authorization Bearer token (cryptographically signed JWT)
  let rawAuthHeader: string | null = null;

  if (req) {
    rawAuthHeader = req.headers.get("authorization");
  }

  if (!rawAuthHeader) {
    try {
      const h = await headers();
      rawAuthHeader = h.get("authorization");
    } catch {
      // Ignore error if headers() fails in some contexts
    }
  }

  if (rawAuthHeader && /^Bearer\s+/i.test(rawAuthHeader)) {
    const token = rawAuthHeader.replace(/^Bearer\s+/i, "").trim();
    if (token) {
      const verifiedUserId = verifyMobileToken(token);
      if (verifiedUserId) {
        return { userId: verifiedUserId, response: null };
      }
      // If a Bearer token is provided but fails cryptographic verification, reject immediately!
      return {
        userId: null,
        response: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }),
      };
    }
  }

  // 2. Fallback to Web Session
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      userId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId, response: null };
}

export async function requireRole(
  allowedRoles: string | string[],
  req?: Request
): Promise<RequireRoleResult> {
  const auth = await requireUserId(req);
  if (auth.response) {
    return { userId: null, role: null, response: auth.response };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: auth.userId! },
      select: { role: true },
    });

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!user || !roles.includes(user.role)) {
      return {
        userId: auth.userId,
        role: user?.role ?? null,
        response: NextResponse.json(
          { error: "Forbidden: Insufficient permissions" },
          { status: 403 }
        ),
      };
    }

    return { userId: auth.userId, role: user.role, response: null };
  } catch {
    return {
      userId: auth.userId,
      role: null,
      response: NextResponse.json({ error: "Internal Server Error" }, { status: 500 }),
    };
  }
}
