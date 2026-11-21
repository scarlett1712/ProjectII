import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiErrorMessage, apiRequest, isAbortError } from "./api";

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

describe("apiRequest", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends JSON and returns the parsed body on success", async () => {
    const fetchMock = respond(200, { ok: true });
    await expect(apiRequest("/api/x", { method: "POST", body: { a: 1 } })).resolves.toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(init?.body).toBe('{"a":1}');
  });

  it("throws ApiError with the server message and code on a non-2xx status", async () => {
    respond(400, { error: "Số tiền không hợp lệ", code: "budget.invalid" });
    const error = await apiRequest("/api/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, message: "Số tiền không hợp lệ", code: "budget.invalid" });
    expect(apiErrorMessage(error, "fallback")).toBe("Số tiền không hợp lệ");
  });

  it("recognises aborted requests and falls back for unknown errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new DOMException("aborted", "AbortError"));
    const error = await apiRequest("/api/x").catch((e: unknown) => e);
    expect(isAbortError(error)).toBe(true);
    expect(isAbortError(new ApiError(500, "x"))).toBe(false);
    expect(apiErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
  });
});
