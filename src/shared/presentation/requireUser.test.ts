import { describe, expect, it, vi, beforeEach } from "vitest";
import { requireUserId } from "./requireUser";
import { signMobileToken } from "@/shared/infrastructure/token";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock @/shared/infrastructure/auth
vi.mock("@/shared/infrastructure/auth", () => ({
  getAuthSession: vi.fn(),
}));

// Mock @/shared/infrastructure/db
vi.mock("@/shared/infrastructure/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { getAuthSession } from "@/shared/infrastructure/auth";
import { db } from "@/shared/infrastructure/db";

describe("requireUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts userId from valid cryptographically signed Bearer token in Request", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ tokenVersion: 0 } as never);
    const validToken = signMobileToken("user-verified-123");
    const req = new Request("http://localhost:3000/api/test", {
      headers: { authorization: `Bearer ${validToken}` },
    });
    const result = await requireUserId(req);
    expect(result.userId).toBe("user-verified-123");
    expect(result.response).toBeNull();
  });

  it("rejects a Bearer token issued before the password was changed", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ tokenVersion: 2 } as never);
    const req = new Request("http://localhost:3000/api/test", {
      headers: { authorization: `Bearer ${signMobileToken("user-1", 1)}` },
    });
    const result = await requireUserId(req);
    expect(result.userId).toBeNull();
    expect(result.response?.status).toBe(401);
  });

  it("rejects a Bearer token of a deleted account", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(null);
    const req = new Request("http://localhost:3000/api/test", {
      headers: { authorization: `Bearer ${signMobileToken("ghost")}` },
    });
    expect((await requireUserId(req)).response?.status).toBe(401);
  });

  it("rejects forged or unsigned Bearer token with 401 Unauthorized", async () => {
    const req = new Request("http://localhost:3000/api/test", {
      headers: { authorization: "Bearer forged-fake-token" },
    });
    const result = await requireUserId(req);
    expect(result.userId).toBeNull();
    expect(result.response?.status).toBe(401);
  });

  it("ignores raw x-user-id header and does not allow auth bypass", async () => {
    vi.mocked(getAuthSession).mockResolvedValueOnce(null);
    const req = new Request("http://localhost:3000/api/test", {
      headers: { "x-user-id": "victim-user-456" },
    });
    const result = await requireUserId(req);
    // x-user-id must be ignored! Result should be 401 because session is null
    expect(result.userId).toBeNull();
    expect(result.response?.status).toBe(401);
  });

  it("falls back to session user id when headers are absent", async () => {
    vi.mocked(getAuthSession).mockResolvedValueOnce({
      user: { id: "session-user-789" },
      expires: "2099",
    });

    const result = await requireUserId();
    expect(result.userId).toBe("session-user-789");
    expect(result.response).toBeNull();
  });

  it("returns 401 Unauthorized when neither header nor session exists", async () => {
    vi.mocked(getAuthSession).mockResolvedValueOnce(null);

    const result = await requireUserId();
    expect(result.userId).toBeNull();
    expect(result.response?.status).toBe(401);
  });
});

