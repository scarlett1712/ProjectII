import { NextResponse } from "next/server";
import type { ApiMessageValues } from "@/shared/application/errors";
import { getApiTranslator, type ApiMessageKey } from "@/shared/i18n/apiTranslator";

/** Translate error codes into localized messages. Pass through other strings, such as Zod's default messages. */
export function translateApiMessage(code: string, values?: ApiMessageValues): string {
  const t = getApiTranslator();
  return t.has(code as ApiMessageKey) ? t(code as ApiMessageKey, values as never) : code;
}

/** Standard API error response: { error: <translated message>, code: <error key> }. */
export function apiErrorResponse(
  status: number,
  code: ApiMessageKey,
  values?: ApiMessageValues,
  init?: { headers?: HeadersInit; extra?: Record<string, unknown> },
) {
  return NextResponse.json(
    { error: translateApiMessage(code, values), code, ...init?.extra },
    { status, headers: init?.headers },
  );
}
