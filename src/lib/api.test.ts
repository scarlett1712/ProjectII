import { describe, expect, it, vi, beforeEach } from "vitest";
import { requireUserId, requireRole } from "./api";
import { signMobileToken } from "./token";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock @/lib/auth
vi.mock("@/lib/auth", () => ({
  getAuthSession: vi.fn(),
}));

// Mock @/lib/db
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

describe("requireUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts userId from valid cryptographically signed Bearer token in Request", async () => {
    const validToken = signMobileToken("user-verified-123");
    const req = new Request("http://localhost:3000/api/test", {
      headers: { authorization: `Bearer ${validToken}` },
    });
    const result = await requireUserId(req);
    expect(result.userId).toBe("user-verified-123");
    expect(result.response).toBeNull();
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

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    vi.mocked(getAuthSession).mockResolvedValueOnce(null);

    const result = await requireRole("ADMIN");
    expect(result.response?.status).toBe(401);
  });

  it("returns 403 Forbidden if user role does not match required role", async () => {
    vi.mocked(getAuthSession).mockResolvedValueOnce({
      user: { id: "user-normal" },
      expires: "2099",
    });
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      role: "USER",
    } as any);

    const result = await requireRole("ADMIN");
    expect(result.response?.status).toBe(403);
  });

  it("succeeds when user role matches required role", async () => {
    vi.mocked(getAuthSession).mockResolvedValueOnce({
      user: { id: "user-admin" },
      expires: "2099",
    });
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      role: "ADMIN",
    } as any);

    const result = await requireRole("ADMIN");
    expect(result.response).toBeNull();
    if (!result.response) {
      expect(result.role).toBe("ADMIN");
    }
  });

  it("accepts an array of allowed roles", async () => {
    vi.mocked(getAuthSession).mockResolvedValueOnce({
      user: { id: "user-moderator" },
      expires: "2099",
    });
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      role: "MODERATOR",
    } as any);

    const result = await requireRole(["ADMIN", "MODERATOR"]);
    expect(result.response).toBeNull();
    if (!result.response) {
      expect(result.role).toBe("MODERATOR");
    }
  });
});
