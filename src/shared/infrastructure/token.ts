import crypto from "crypto";

/** Mobile tokens expire after 30 days. */
const MOBILE_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;
const HEADER = { alg: "HS256", typ: "JWT" } as const;

/** Mobile token claims. tokenVersion matches User.tokenVersion at signing and increments on password change. */
export interface MobileTokenClaims {
  userId: string;
  tokenVersion: number;
}

/** Signing secret shared with NextAuth. Fail immediately when configuration is missing. */
function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET (hoặc AUTH_SECRET) chưa được cấu hình.");
  return secret;
}

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const decode = (part: string): unknown => JSON.parse(Buffer.from(part, "base64url").toString("utf-8"));
const sign = (data: string) => crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");

/** Sign a mobile token with HS256 and a 30-day expiration. */
export function signMobileToken(userId: string, tokenVersion = 0): string {
  const now = Math.floor(Date.now() / 1000);
  const header = encode(HEADER);
  const payload = encode({ sub: userId, tv: tokenVersion, iat: now, exp: now + MOBILE_TOKEN_TTL_SEC });
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

/** Check the mobile token signature, algorithm and expiration. Return the claims or null for an invalid token. */
export function verifyMobileToken(token: string): MobileTokenClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(sign(`${header}.${payload}`));
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const { alg } = decode(header) as { alg?: unknown };
    if (alg !== HEADER.alg) return null;

    const data = decode(payload) as { sub?: unknown; tv?: unknown; exp?: unknown };
    if (typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof data.sub !== "string") return null;
    // Treat tokens issued before the tv claim existed as version zero.
    return { userId: data.sub, tokenVersion: typeof data.tv === "number" ? data.tv : 0 };
  } catch {
    return null;
  }
}
