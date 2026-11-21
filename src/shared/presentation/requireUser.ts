import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuthSession } from "@/shared/infrastructure/auth";
import { findUserTokenVersion } from "@/shared/infrastructure/userTokenRepository";
import { verifyMobileToken } from "@/shared/infrastructure/token";
import { apiErrorResponse } from "./apiError";

export type RequireUserIdResult =
  | { userId: string; response: null }
  | { userId: null; response: NextResponse };

/** A mobile token remains valid while its account exists and its password has not changed since signing. */
async function isTokenVersionCurrent(userId: string, tokenVersion: number): Promise<boolean> {
  const current = await findUserTokenVersion(userId);
  return current !== null && tokenVersion >= current;
}

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
      const claims = verifyMobileToken(token);
      if (claims && (await isTokenVersionCurrent(claims.userId, claims.tokenVersion))) {
        return { userId: claims.userId, response: null };
      }
      // Reject bearer tokens with invalid signatures, expired tokens and tokens revoked by password changes or account deletion.
      return {
        userId: null,
        response: apiErrorResponse(401, "common.invalidToken"),
      };
    }
  }

  // 2. Fallback to Web Session
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      userId: null,
      response: apiErrorResponse(401, "common.unauthorized"),
    };
  }
  return { userId, response: null };
}
