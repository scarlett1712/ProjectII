import type { ApiMessageKey } from "@/shared/i18n/apiTranslator";

/** Error interpolation values, such as { remaining: 3 } for a message about remaining attempts. */
export type ApiMessageValues = Record<string, string | number>;

/**
 * Use cases throw a business error with an HTTP status and a message key from the api namespace.
 * The presentation layer (withUser) translates the key and returns { error, code }.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiMessageKey,
    readonly values?: ApiMessageValues,
  ) {
    super(code);
    this.name = "HttpError";
  }
}

export const badRequest = (code: ApiMessageKey, values?: ApiMessageValues) => new HttpError(400, code, values);
export const notFound = (code: ApiMessageKey, values?: ApiMessageValues) => new HttpError(404, code, values);

/**
 * Mark an error key as a Zod message (for example, z.string({ error: messageKey("...") })) so TypeScript
 * can check it. The presentation layer translates it when returning HTTP 400.
 */
export const messageKey = (key: ApiMessageKey): string => key;
