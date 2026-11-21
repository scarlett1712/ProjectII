import { describe, expect, it } from "vitest";
import { API_ROUTES, ROUTES, isRouteActive, withQuery } from "./routes";

describe("withQuery", () => {
  it("trả nguyên đường dẫn khi không có tham số", () => {
    expect(withQuery(API_ROUTES.tasks, {})).toBe("/api/tasks");
  });

  it("ghép tham số theo thứ tự và bỏ qua undefined/null", () => {
    expect(withQuery(API_ROUTES.tasks, { id: "a1", mode: undefined, extra: null, page: 2 })).toBe("/api/tasks?id=a1&page=2");
  });

  it("mã hoá giá trị đặc biệt", () => {
    expect(withQuery(API_ROUTES.search, { q: "cà phê & trà" })).toBe(
      `/api/search?q=${new URLSearchParams({ q: "cà phê & trà" }).toString().slice(2)}`,
    );
    const url = new URL(withQuery(API_ROUTES.chat, { sessionId: "a,b" }), "http://x");
    expect(url.searchParams.get("sessionId")).toBe("a,b");
  });

  it("giữ số 0 và false", () => {
    expect(withQuery(ROUTES.login, { revoked: 1, n: 0, f: false })).toBe("/login?revoked=1&n=0&f=false");
  });
});

describe("isRouteActive", () => {
  it("khớp chính trang và trang con", () => {
    expect(isRouteActive("/chat", ROUTES.chat)).toBe(true);
    expect(isRouteActive("/chat/abc", ROUTES.chat)).toBe(true);
  });

  it("không khớp trang chỉ trùng tiền tố", () => {
    expect(isRouteActive("/chatbot", ROUTES.chat)).toBe(false);
    expect(isRouteActive("/dashboard", ROUTES.chat)).toBe(false);
  });
});
