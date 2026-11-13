import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

export type RequireUserIdResult =
  | { userId: string; response: null }
  | { userId: null; response: NextResponse };

export type RequireRoleResult =
  | { userId: string; role: string; response: null }
  | { userId: string | null; role: string | null; response: NextResponse };

export async function requireUserId(req?: Request): Promise<RequireUserIdResult> {
  // 1. Check for Mobile Authorization Bearer or x-user-id Header
  try {
    const h = await headers();
    const authHeader = h.get("authorization") || h.get("x-user-id");
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token) {
        return { userId: token, response: null };
      }
    }
  } catch {
    // Ignore error if headers() fails in some contexts
  }

  if (req) {
    const authHeader = req.headers.get("authorization") || req.headers.get("x-user-id");
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token) {
        return { userId: token, response: null };
      }
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
