import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

vi.mock("./requireUser", () => ({ requireUserId: vi.fn() }));

import { requireUserId } from "./requireUser";
import { messageKey } from "@/shared/application/errors";
import { badRequest, notFound, readJson, withErrorHandling, withUser } from "./http";

const req = (body?: string) =>
  new NextRequest("http://localhost/api/test", { method: "POST", body });

describe("withUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("returns the auth response when the user is not signed in", async () => {
    const unauthorized = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    vi.mocked(requireUserId).mockResolvedValue({ userId: null, response: unauthorized });
    const handler = vi.fn();

    const res = await withUser(handler)(req());

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes the userId and serialises the result as JSON", async () => {
    vi.mocked(requireUserId).mockResolvedValue({ userId: "u1", response: null });

    const res = await withUser((_, userId) => ({ userId }))(req());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "u1" });
  });

  it("maps HttpError, ZodError and unknown errors to status codes", async () => {
    vi.mocked(requireUserId).mockResolvedValue({ userId: "u1", response: null });

    const notFoundRes = await withUser(() => {
      throw notFound("nutrition.mealNotFound");
    })(req());
    const zodRes = await withUser(() => z.object({ a: z.string({ error: messageKey("common.missingId") }) }).parse({}))(req());
    const crashRes = await withUser(() => {
      throw new Error("boom");
    }, { errorCode: "budget.loadOverviewFailed" })(req());

    expect([notFoundRes.status, await notFoundRes.json()]).toEqual([
      404,
      { error: "Không tìm thấy bữa ăn", code: "nutrition.mealNotFound" },
    ]);
    expect([zodRes.status, await zodRes.json()]).toEqual([400, { error: "Thiếu ID.", code: "common.missingId" }]);
    expect([crashRes.status, await crashRes.json()]).toEqual([
      500,
      { error: "Lỗi tải dữ liệu tài chính", code: "budget.loadOverviewFailed" },
    ]);
  });

  it("keeps zod's own message when the schema has no message key", async () => {
    vi.mocked(requireUserId).mockResolvedValue({ userId: "u1", response: null });

    const res = await withUser(() => z.object({ a: z.string() }).parse({}))(req());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe(body.code);
  });
});

describe("errorResponse with Prisma errors", () => {
  it("maps record-not-found to 404 and unique conflicts to 409", async () => {
    const { errorResponse } = await import("./http");
    expect(errorResponse(Object.assign(new Error("x"), { code: "P2025" })).status).toBe(404);
    expect(errorResponse(Object.assign(new Error("x"), { code: "P2002" })).status).toBe(409);
    vi.spyOn(console, "error").mockImplementationOnce(() => undefined);
    expect(errorResponse(Object.assign(new Error("x"), { code: "P1001" })).status).toBe(500);
  });
});

describe("withErrorHandling", () => {
  it("passes through Response objects untouched", async () => {
    const res = await withErrorHandling(() => NextResponse.json({ ok: true }, { status: 201 }))(req());
    expect(res.status).toBe(201);
  });

  it("returns 400 for an HttpError thrown by the handler", async () => {
    const res = await withErrorHandling(() => {
      throw badRequest("common.invalidData");
    })(req());
    expect(res.status).toBe(400);
  });
});

describe("readJson", () => {
  it("throws a 400 HttpError for a malformed body", async () => {
    await expect(readJson(req("{bad"))).rejects.toMatchObject({ status: 400 });
  });
});
