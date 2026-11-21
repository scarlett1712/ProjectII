import { describe, expect, it } from "vitest";
import { markNewSignup, markTourCompleted, restartOnboarding, shouldShowTour } from "./onboarding";
import { createMemoryStorage } from "./testStorage";

const EMAIL = "a@b.c";

describe("onboarding flags", () => {
  it("chưa đăng ký mới thì không hiện tour", () => {
    expect(shouldShowTour("dashboard", EMAIL, createMemoryStorage())).toBe(false);
  });

  it("markNewSignup ghi cả cờ theo email và cờ chung", () => {
    const storage = createMemoryStorage();
    markNewSignup(EMAIL, storage);
    expect(storage.data.get(`is-new-signup-${EMAIL}`)).toBe("true");
    expect(storage.data.get("is-new-signup")).toBe("true");
    expect(shouldShowTour("dashboard", EMAIL, storage)).toBe(true);
  });

  it("xem xong tour thì không hiện lại ở trang đó", () => {
    const storage = createMemoryStorage();
    markNewSignup(EMAIL, storage);
    markTourCompleted("dashboard", EMAIL, storage);
    expect(shouldShowTour("dashboard", EMAIL, storage)).toBe(false);
    expect(shouldShowTour("calendar", EMAIL, storage)).toBe(true);
  });

  it("restartOnboarding xoá trạng thái đã xem tour", () => {
    const storage = createMemoryStorage();
    markNewSignup(EMAIL, storage);
    markTourCompleted("dashboard", EMAIL, storage);
    restartOnboarding(EMAIL, storage);
    expect(shouldShowTour("dashboard", EMAIL, storage)).toBe(true);
  });
});
