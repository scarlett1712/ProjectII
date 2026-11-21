"use client";

/** API error containing the server's translated error message and machine-readable code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Send the body as JSON. */
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Send and receive JSON through the internal API. Non-2xx statuses throw ApiError.
 * Cancelled requests throw AbortError (see isAbortError).
 */
export async function apiRequest<T = unknown>(url: string, { method = "GET", body, signal }: ApiRequestOptions = {}): Promise<T> {
  const res = await fetch(url, {
    method,
    signal,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const { error, code } = (data ?? {}) as { error?: unknown; code?: unknown };
    throw new ApiError(res.status, typeof error === "string" ? error : res.statusText, typeof code === "string" ? code : undefined);
  }
  return data as T;
}

/** Ignore cancellations when a newer month, day or session supersedes a pending request. */
export function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

/** Prefer the server's error message and use fallback when unavailable. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}
