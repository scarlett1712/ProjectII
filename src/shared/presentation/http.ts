import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError, badRequest, notFound } from "@/shared/application/errors";
import type { ApiMessageKey } from "@/shared/i18n/apiTranslator";
import { apiErrorResponse, translateApiMessage } from "./apiError";
import { applyRateLimit, rateLimitResponse } from "./rateLimit";
import { requireUserId } from "./requireUser";

export { HttpError, badRequest, notFound };

type Handler = (req: NextRequest) => Promise<unknown> | unknown;
type AuthedHandler = (req: NextRequest, userId: string) => Promise<unknown> | unknown;

export interface RateLimitOption {
  /** IP-based counter key prefix, such as "search". */
  keyPrefix: string;
  limit: number;
  windowMs: number;
}

interface HandlerOptions {
  /** Error code for unexpected failures (HTTP 500). */
  errorCode?: ApiMessageKey;
  /** Apply the IP request limit before authentication. */
  rateLimit?: RateLimitOption;
}

/** Return a 429 response when the IP exceeds the limit, otherwise null. */
function checkRateLimit(req: NextRequest, option?: RateLimitOption): Response | null {
  if (!option) return null;
  const result = applyRateLimit(req, option);
  return result.success ? null : rateLimitResponse(result.reset);
}

const DEFAULT_ERROR_CODE: ApiMessageKey = "common.serverError";

/** Wrap a public route handler, serializing results as JSON and errors as { error, code }. */
export function withErrorHandling(handler: Handler, options: HandlerOptions = {}) {
  return async (req: NextRequest): Promise<Response> => {
    const limited = checkRateLimit(req, options.rateLimit);
    if (limited) return limited;
    try {
      return toResponse(await handler(req));
    } catch (error) {
      return errorResponse(error, options.errorCode);
    }
  };
}

/** Like withErrorHandling, with authentication through a web session or a mobile bearer token. */
export function withUser(handler: AuthedHandler, options: HandlerOptions = {}) {
  return async (req: NextRequest): Promise<Response> => {
    const limited = checkRateLimit(req, options.rateLimit);
    if (limited) return limited;
    const auth = await requireUserId(req);
    if (auth.response) return auth.response;
    try {
      return toResponse(await handler(req, auth.userId));
    } catch (error) {
      return errorResponse(error, options.errorCode);
    }
  };
}

/** Read the JSON body and return 400 for malformed input. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw badRequest("common.invalidBody");
  }
}

function toResponse(data: unknown): Response {
  return data instanceof Response ? data : NextResponse.json(data);
}

export function errorResponse(error: unknown, fallbackCode: ApiMessageKey = DEFAULT_ERROR_CODE): Response {
  if (error instanceof HttpError) {
    return apiErrorResponse(error.status, error.code, error.values);
  }
  if (error instanceof ZodError) {
    // Schema messages contain translation keys. Return Zod's default messages verbatim.
    const message = error.issues[0]?.message;
    if (!message) return apiErrorResponse(400, "common.invalidData");
    return NextResponse.json({ error: translateApiMessage(message), code: message }, { status: 400 });
  }
  const prismaStatus = prismaErrorStatus(error);
  if (prismaStatus === 404) return apiErrorResponse(404, "common.notFound");
  if (prismaStatus === 409) return apiErrorResponse(409, "common.conflict");
  console.error(error);
  return apiErrorResponse(500, fallbackCode);
}

/**
 * Map client-visible Prisma errors: P2025 (record missing during update or delete) returns 404,
 * and P2002 (unique constraint violation) returns 409. Match codes to keep presentation independent of Prisma.
 */
function prismaErrorStatus(error: unknown): 404 | 409 | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  const { code } = error as { code: unknown };
  if (code === "P2025") return 404;
  if (code === "P2002") return 409;
  return null;
}
