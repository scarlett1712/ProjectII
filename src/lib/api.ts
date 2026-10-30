import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuthSession } from "@/lib/auth";

export async function requireUserId(req?: Request) {
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
